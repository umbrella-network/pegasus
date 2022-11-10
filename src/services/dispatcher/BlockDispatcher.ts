import {inject, injectable, postConstruct} from 'inversify';
import {Logger} from 'winston';
import newrelic from 'newrelic';
import {ABI, GasEstimator, LeafKeyCoder} from '@umb-network/toolbox';
import {remove0x} from '@umb-network/toolbox/dist/utils/helpers';
import {TransactionResponse, TransactionReceipt} from '@ethersproject/providers';
import {parseEther} from 'ethers/lib/utils';
import {BigNumber, ethers, Signature} from 'ethers';

import {ChainStatus} from '../../types/ChainStatus';
import ChainContract from '../../contracts/ChainContract';
import {IBlockChainDispatcher} from './IBlockChainDispatcher';
import Settings from '../../types/Settings';
import Blockchain from '../../lib/Blockchain';
import {FailedTransactionEvent} from '../../constants/ReportedMetricsEvents';
import {BlockchainRepository} from '../../repositories/BlockchainRepository';
import {ChainContractRepository} from '../../repositories/ChainContractRepository';
import {HexStringWith0x} from '../../types/custom';
import {MintedBlock} from '../../types/MintedBlock';
import {LogMint} from '../../types/events';
import {sleep} from '../../utils/sleep';
import BlockRepository from '../BlockRepository';
import {ConsensusDataRepository} from '../../repositories/ConsensusDataRepository';
import {ChainsIds} from '../../types/ChainsIds';
import {CanMint} from '../CanMint';
import {MultichainArchitectureDetector} from '../MultichainArchitectureDetector';
import {SubmitTxMonitor} from '../SubmitTxMonitor';

@injectable()
export abstract class BlockDispatcher implements IBlockChainDispatcher {
  @inject('Logger') protected logger!: Logger;
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;
  @inject('Settings') settings!: Settings;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(CanMint) canMint!: CanMint;
  @inject(SubmitTxMonitor) submitTxMonitor!: SubmitTxMonitor;
  @inject(ConsensusDataRepository) consensusDataRepository!: ConsensusDataRepository;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;
  @inject(MultichainArchitectureDetector) multichainArchitectureDetector!: MultichainArchitectureDetector;

  readonly chainId!: ChainsIds;
  protected blockchain!: Blockchain;
  protected chainContract!: ChainContract;

  @postConstruct()
  protected setup(): void {
    this.chainContract = this.chainContractRepository.get(this.chainId);
    this.blockchain = this.blockchainRepository.get(this.chainId);
  }

  getStatus = async (): Promise<[address: string, status: ChainStatus]> => {
    return this.chainContract.resolveStatus();
  };

  apply = async (): Promise<void> => {
    if (!(await this.useDispatcher(this.chainId))) {
      this.logger.info(`[${this.chainId}] OLD chain architecture detected`);
      await sleep(60_000); // slow down execution
      return;
    }

    await this.checkBalanceIsEnough(this.chainId);
    const consensus = await this.consensusDataRepository.read();

    if (!consensus) {
      this.logger.info(`[${this.chainId}] no consensus data found to dispatch`);
      return;
    }

    if (this.submitTxMonitor.wasDataSubmitted(this.chainId, consensus.dataTimestamp)) {
      this.logger.info(`[${this.chainId}] Block for ${consensus.dataTimestamp} already submitted`);
      return;
    }

    const [chainAddress, chainStatus] = await this.getStatus();

    if (!this.canMint.apply({dataTimestamp: consensus.dataTimestamp, chainStatus, chainId: this.chainId})) {
      return;
    }

    this.logger.info(
      `[${this.chainId}] Minting a block ${consensus.dataTimestamp} with ${consensus.signatures.length} signatures, ${consensus.leaves.length} leaves, ${consensus.fcdKeys.length} FCDs`,
    );

    const mintedBlock = await this.mint(
      consensus.dataTimestamp,
      consensus.root,
      consensus.fcdKeys,
      consensus.fcdValues,
      consensus.signatures,
      chainStatus,
    );

    if (mintedBlock) {
      const {hash, logMint} = mintedBlock;
      this.logger.info(`[${this.chainId}] New Block ${logMint.blockId} minted with TX ${hash}`);
      this.submitTxMonitor.saveTx(this.chainId, consensus.dataTimestamp, hash);
      await this.blockRepository.saveBlock(chainAddress, consensus, logMint.blockId.toNumber(), true);
    }
  };

  protected static isNonceError(e: Error): boolean {
    return e.message.includes('nonce has already been used');
  }

  private checkBalanceIsEnough = async (chainId: ChainsIds): Promise<void> => {
    const balance = await this.blockchain.wallet.getBalance();
    const toCurrency = parseEther;

    this.testBalanceThreshold(chainId, balance, toCurrency, this.blockchain.wallet.address);
  };

  private testBalanceThreshold = (
    chainId: ChainsIds,
    balance: BigNumber,
    toCurrency: (amount: string) => BigNumber,
    address: string,
  ) => {
    const {errorLimit, warningLimit} = this.blockchain.chainSettings.transactions.mintBalance;

    if (balance.lt(toCurrency(errorLimit))) {
      throw new Error(`[${chainId}] Balance (${address.slice(0, 10)}) is lower than ${errorLimit}`);
    }

    if (balance.lt(toCurrency(warningLimit))) {
      this.logger.warn(`[${chainId}] Balance (${address.slice(0, 10)}) is lower than ${warningLimit}`);
    }
  };

  private async submitTx(
    dataTimestamp: number,
    root: string,
    keys: string[],
    values: HexStringWith0x[],
    signatures: string[],
    chainStatus: ChainStatus,
    nonce?: number,
  ) {
    const components = signatures.map((signature) => BlockDispatcher.splitSignature(signature));
    const {minGasPrice, maxGasPrice} = this.blockchain.chainSettings.transactions;
    const gasMetrics = await GasEstimator.apply(this.blockchain.provider, minGasPrice, maxGasPrice);

    this.logger.info(`[${this.chainId}] Submitting tx, gas metrics: ${GasEstimator.printable(gasMetrics)}`);

    const fn = () =>
      this.chainContract.submit(
        dataTimestamp,
        root,
        keys.map(LeafKeyCoder.encode),
        values.map((v) => Buffer.from(remove0x(v), 'hex')),
        components.map((sig) => sig.v),
        components.map((sig) => sig.r),
        components.map((sig) => sig.s),
        gasMetrics.gasPrice,
        nonce,
      );

    const {tx, receipt, timeoutMs} = await this.executeTx(fn, chainStatus.timePadding * 1000);

    if (!receipt) {
      this.logger.warn(`[${this.chainId}] canceling tx ${tx.hash}`);
      await this.cancelPendingTransaction(gasMetrics.gasPrice, chainStatus.timePadding).catch(this.logger.warn);
      throw new Error(`[${this.chainId}] mint TX timeout: ${timeoutMs}ms`);
    }

    if (receipt.status !== 1) {
      newrelic.recordCustomEvent(FailedTransactionEvent, {
        transactionHash: receipt.transactionHash,
      });

      return null;
    }

    const logMint = this.getLogMint(receipt.logs);

    if (!logMint) {
      return null;
    }

    return {hash: receipt.transactionHash, logMint};
  }

  private static splitSignature(signature: string): Signature {
    return ethers.utils.splitSignature(signature);
  }

  private async mint(
    dataTimestamp: number,
    root: string,
    keys: string[],
    values: HexStringWith0x[],
    signatures: string[],
    chainStatus: ChainStatus,
  ): Promise<MintedBlock | null> {
    try {
      try {
        return await this.submitTx(dataTimestamp, root, keys, values, signatures, chainStatus);
      } catch (e) {
        if (!BlockDispatcher.isNonceError(<Error>e)) {
          throw e;
        }
        const lastNonce = await this.blockchain.wallet.getTransactionCount('latest');
        this.logger.warn(`[${this.chainId}] Submit tx with nonce ${lastNonce} failed. Retrying with ${lastNonce + 1}`);
        return await this.submitTx(dataTimestamp, root, keys, values, signatures, chainStatus, lastNonce + 1);
      }
    } catch (e) {
      const err = await this.handleTimestampDiscrepancyError(<Error>e, dataTimestamp);

      newrelic.noticeError(err);
      this.logger.error(err);
      return null;
    }
  }

  private async waitUntilNextBlock(currentBlockNumber: number): Promise<number> {
    // it would be nice to subscribe for blockNumber, but we're forcing http for RPC
    // this is not pretty solution, but we're using proxy, so infura calls should not increase
    let newBlockNumber = await this.blockchain.getBlockNumber();

    while (currentBlockNumber === newBlockNumber) {
      this.logger.info(`[${this.chainId}] waitUntilNextBlock: current ${currentBlockNumber}, new ${newBlockNumber}.`);
      await sleep(this.settings.blockchain.transactions.waitForBlockTime);
      newBlockNumber = await this.blockchain.getBlockNumber();
    }

    return newBlockNumber;
  }

  private async executeTx(
    fn: () => Promise<TransactionResponse>,
    timeoutMs: number,
  ): Promise<{tx: TransactionResponse; receipt: TransactionReceipt | undefined; timeoutMs: number}> {
    const [currentBlockNumber, tx] = await Promise.all([this.blockchain.getBlockNumber(), fn()]);
    // there is no point of doing any action on tx if block is not minted
    const newBlockNumber = await this.waitUntilNextBlock(currentBlockNumber);
    this.logger.info(`[${this.chainId}] New block detected ${newBlockNumber}, waiting for tx to be minted.`);

    return {tx, receipt: await Promise.race([tx.wait(), BlockDispatcher.txTimeout(timeoutMs)]), timeoutMs};
  }

  private static async txTimeout(timeout: number): Promise<undefined> {
    return new Promise<undefined>((resolve) =>
      setTimeout(async () => {
        resolve(undefined);
      }, timeout),
    );
  }

  private async handleTimestampDiscrepancyError(e: Error, dataTimestamp: number): Promise<Error> {
    if (!e.message.includes('you can predict the future')) {
      return e;
    }

    const blockTimestamp = await this.blockchain.getBlockTimestamp();
    return new Error(`[${this.chainId}] Timestamp discrepancy ${blockTimestamp - dataTimestamp}s: (${e.message})`);
  }

  private async cancelPendingTransaction(prevGasPrice: number, timePadding: number): Promise<boolean> {
    const {minGasPrice, maxGasPrice} = this.blockchain.chainSettings.transactions;
    const gasMetrics = await GasEstimator.apply(this.blockchain.provider, minGasPrice, maxGasPrice);

    const txData = {
      from: this.blockchain.wallet.address,
      to: this.blockchain.wallet.address,
      value: BigNumber.from(0),
      nonce: await this.blockchain.wallet.getTransactionCount('latest'),
      gasLimit: 21000,
      gasPrice: Math.max(gasMetrics.gasPrice, prevGasPrice) * 2,
    };

    this.logger.warn(`[${this.chainId}] Sending canceling tx`, {nonce: txData.nonce, gasPrice: txData.gasPrice});

    const fn = () => this.blockchain.wallet.sendTransaction(txData);

    const {tx, receipt} = await this.executeTx(fn, timePadding * 1000);

    if (!receipt || receipt.status !== 1) {
      this.logger.warn(`[${this.chainId}] Canceling tx ${tx.hash} filed or still pending`);
      return false;
    }

    return receipt.status === 1;
  }

  private getLogMint(logs: ethers.providers.Log[]): LogMint {
    const iface = new ethers.utils.Interface(ABI.chainAbi);
    const logMint = logs.map((log) => iface.parseLog(log)).find((event) => event.name === 'LogMint');

    if (!logMint) {
      throw Error(`[${this.chainId}] can't find LogMint in logs`);
    }

    const {minter, staked, blockId, power} = logMint.args;
    return {minter, staked, blockId, power};
  }

  private async useDispatcher(chainId: ChainsIds): Promise<boolean> {
    if (chainId == this.settings.blockchain.masterChain.chainId) {
      // homechain is compatible with multichain
      return true;
    }

    return this.multichainArchitectureDetector.apply(chainId);
  }
}
