import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import {BigNumber, ethers, Signature} from 'ethers';
import {ABI, LeafKeyCoder} from '@umb-network/toolbox';
import {getModelForClass} from '@typegoose/typegoose';
import newrelic from 'newrelic';
import {TransactionResponse, TransactionReceipt} from '@ethersproject/providers';
import {remove0x} from '@umb-network/toolbox/dist/utils/helpers';

import {HexStringWith0x} from '../types/Feed';
import ConsensusRunner from './ConsensusRunner';
import BlockRepository from './BlockRepository';
import SignatureCollector from './SignatureCollector';
import SortedMerkleTreeFactory from './SortedMerkleTreeFactory';
import TimeService from './TimeService';
import ChainContract from '../contracts/ChainContract';
import Blockchain from '../lib/Blockchain';
import Block from '../models/Block';
import {ChainStatus} from '../types/ChainStatus';
import Settings from '../types/Settings';
import {LogMint} from '../types/events';
import {chainReadyForNewBlock} from '../utils/mining';
import {MintedBlock} from '../types/MintedBlock';
import {FailedTransactionEvent} from '../constants/ReportedMetricsEvents';
import GasEstimator from './GasEstimator';
import {parseEther} from 'ethers/lib/utils';

@injectable()
class BlockMinter {
  @inject('Logger') logger!: Logger;
  @inject(Blockchain) blockchain!: Blockchain;
  @inject(ChainContract) chainContract!: ChainContract;
  @inject(ConsensusRunner) consensusRunner!: ConsensusRunner;
  @inject(TimeService) timeService!: TimeService;
  @inject(SignatureCollector) signatureCollector!: SignatureCollector;
  @inject(SortedMerkleTreeFactory) sortedMerkleTreeFactory!: SortedMerkleTreeFactory;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject('Settings') settings!: Settings;
  @inject(GasEstimator) gasEstimator!: GasEstimator;

  async apply(): Promise<void> {
    await this.blockchain.setLatestProvider();
    await this.checkBalanceIsEnough();
    const [chainAddress, chainStatus] = await this.chainContract.resolveStatus();

    if (!this.isLeader(chainStatus)) return;

    const dataTimestamp = this.timeService.apply(this.settings.dataTimestampOffsetSeconds);
    const {nextBlockId} = chainStatus;

    if (!(await this.canMint(chainStatus, dataTimestamp))) {
      return;
    }

    this.logger.info(
      `Proposing new block for block: ${chainStatus.blockNumber}/${nextBlockId.toString()} at ${dataTimestamp}...`,
    );

    const validators = this.chainContract.resolveValidators(chainStatus);

    const consensus = await this.consensusRunner.apply(
      dataTimestamp,
      nextBlockId,
      validators,
      chainStatus.staked,
      chainStatus.minSignatures,
    );

    if (!consensus) {
      this.logger.warn(
        `No consensus for block ${chainStatus.blockNumber}/${chainStatus.nextBlockId} at  ${dataTimestamp}`,
      );
      return;
    }

    this.logger.info(
      `Minting a block with ${consensus.signatures.length} signatures, ${consensus.leaves.length} leaves, ${consensus.fcdKeys.length} FCDs`,
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
      this.logger.info(`New Block ${logMint.blockId} minted with TX ${hash}`);
      await this.blockRepository.saveBlock(chainAddress, consensus, logMint.blockId.toNumber(), true);
    }
  }

  private isLeader(chainStatus: ChainStatus): boolean {
    const {blockNumber, nextBlockId, nextLeader} = chainStatus;

    this.logger.info(
      `Next leader for ${blockNumber}/${nextBlockId}: ${nextLeader}, ${nextLeader === this.blockchain.wallet.address}`,
    );

    return nextLeader === this.blockchain.wallet.address;
  }

  private static splitSignature(signature: string): Signature {
    return ethers.utils.splitSignature(signature);
  }

  private async submitTx(
    dataTimestamp: number,
    root: string,
    keys: string[],
    values: HexStringWith0x[],
    signatures: string[],
    chainStatus: ChainStatus,
    nonce?: number,
  ) {
    const components = signatures.map((signature) => BlockMinter.splitSignature(signature));

    const gasMetrics = await this.gasEstimator.apply();

    this.logger.info(`Submitting tx, gas metrics: ${GasEstimator.printable(gasMetrics)}`);

    const fn = () =>
      this.chainContract.submit(
        dataTimestamp,
        root,
        keys.map(LeafKeyCoder.encode),
        values.map((v) => Buffer.from(remove0x(v), 'hex')),
        components.map((sig) => sig.v),
        components.map((sig) => sig.r),
        components.map((sig) => sig.s),
        gasMetrics.estimation,
        nonce,
      );

    const {tx, receipt, timeoutMs} = await this.executeTx(fn, chainStatus.timePadding * 1000);

    if (!receipt) {
      this.logger.warn(`canceling tx ${tx.hash}`);
      await this.cancelPendingTransaction(gasMetrics.estimation, chainStatus.timePadding).catch(this.logger.warn);

      throw new Error(`mint TX timeout: ${timeoutMs}ms`);
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
        if (!BlockMinter.isNonceError(e)) {
          throw e;
        }
        const lastNonce = await this.blockchain.wallet.getTransactionCount('latest');
        this.logger.warn(`Submit tx with nonce ${lastNonce} failed. Retrying with ${lastNonce + 1}`);
        return await this.submitTx(dataTimestamp, root, keys, values, signatures, chainStatus, lastNonce + 1);
      }
    } catch (e) {
      const err = await this.handleTimestampDiscrepancyError(e, dataTimestamp);

      newrelic.noticeError(err);
      this.logger.error(err);
      return null;
    }
  }

  private static async txTimeout(timeout: number): Promise<undefined> {
    return new Promise<undefined>((resolve) =>
      setTimeout(async () => {
        resolve(undefined);
      }, timeout),
    );
  }

  private async waitUntilNextBlock(currentBlockNumber: number): Promise<number> {
    // it would be nice to subscribe for blockNumber, but we forcing http for RPC
    // this is not pretty solution, but we using proxy, so infura calls should not increase
    let newBlockNumber = await this.blockchain.getBlockNumber();

    while (currentBlockNumber === newBlockNumber) {
      this.logger.info(`waitUntilNextBlock: current ${currentBlockNumber}, new ${newBlockNumber}.`);
      await BlockMinter.sleep(this.settings.blockchain.transactions.waitForBlockTime);
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

    this.logger.info(`New block detected ${newBlockNumber}, waiting for tx to be minted.`);

    return {tx, receipt: await Promise.race([tx.wait(), BlockMinter.txTimeout(timeoutMs)]), timeoutMs};
  }

  private static sleep = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

  private static isNonceError(e: Error): boolean {
    return e.message.includes('nonce has already been used');
  }

  private async handleTimestampDiscrepancyError(e: Error, dataTimestamp: number): Promise<Error> {
    if (!e.message.includes('you can predict the future')) {
      return e;
    }

    const blockTimestamp = await this.blockchain.getBlockTimestamp();
    return new Error(`Timestamp discrepancy ${blockTimestamp - dataTimestamp}s: (${e.message})`);
  }

  private async cancelPendingTransaction(prevGasPrice: number, timePadding: number): Promise<boolean> {
    const gasMetrics = await this.gasEstimator.apply();

    const txData = {
      from: this.blockchain.wallet.address,
      to: this.blockchain.wallet.address,
      value: BigNumber.from(0),
      nonce: await this.blockchain.wallet.getTransactionCount('latest'),
      gasLimit: 21000,
      gasPrice: Math.max(gasMetrics.estimation, prevGasPrice) * 2,
    };

    this.logger.warn('Sending canceling tx', {nonce: txData.nonce, gasPrice: txData.gasPrice});

    const fn = () => this.blockchain.wallet.sendTransaction(txData);

    const {tx, receipt} = await this.executeTx(fn, timePadding * 1000);

    if (!receipt || receipt.status !== 1) {
      this.logger.warn(`Canceling tx ${tx.hash} filed or still pending`);
      return false;
    }

    return receipt.status === 1;
  }

  private getLogMint(logs: ethers.providers.Log[]): LogMint {
    const iface = new ethers.utils.Interface(ABI.chainAbi);
    const logMint = logs.map((log) => iface.parseLog(log)).find((event) => event.name === 'LogMint');

    if (!logMint) {
      throw Error('can`t find LogMint in logs');
    }

    const {minter, staked, blockId, power} = logMint.args;
    return {minter, staked, blockId, power};
  }

  private async canMint(chainStatus: ChainStatus, dataTimestamp: number): Promise<boolean> {
    const [ready, error] = chainReadyForNewBlock(chainStatus, dataTimestamp);
    error && this.logger.info(`[BlockMinter] Error while checking if is available to mint ${error}`);
    return ready;
  }

  private async checkBalanceIsEnough(): Promise<void> {
    const balance = await this.blockchain.wallet.getBalance();

    const {errorLimit, warningLimit} = this.settings.blockchain.transactions.mintBalance;

    if (balance.lt(parseEther(errorLimit))) {
      throw new Error(`Balance is lower than ${errorLimit}`);
    }

    if (balance.lt(parseEther(warningLimit))) {
      this.logger.warn(`Balance is lower than ${warningLimit}`);
    }
  }

  private static async getLastSubmittedBlock(): Promise<Block | undefined> {
    // sorting by timestamp because blockId can change eg blocks can be reverted
    // so latest submitted not necessary can be the one with highest blockId
    const blocks: Block[] = await getModelForClass(Block).find({}).limit(1).sort({timestamp: -1}).exec();
    return blocks[0];
  }
}

export default BlockMinter;
