import {inject, injectable, postConstruct} from 'inversify';
import {LeafKeyCoder} from '@umb-network/toolbox';
import {remove0x} from '@umb-network/toolbox/dist/utils/helpers';
import { ethers } from 'ethers';
import {PayableOverrides} from "@ethersproject/contracts";
import {GasEstimation} from "@umb-network/toolbox/dist/types/GasEstimation";

import {ChainStatus} from '../../types/ChainStatus';
import ChainContract from '../../contracts/evm/ChainContract';
import {IBlockChainDispatcher} from './IBlockChainDispatcher';
import {ChainContractRepository} from '../../repositories/ChainContractRepository';
import {HexStringWith0x} from '../../types/custom';
import {sleep} from '../../utils/sleep';
import BlockRepository from '../../repositories/BlockRepository';
import {ConsensusDataRepository} from '../../repositories/ConsensusDataRepository';
import {ChainsIds} from '../../types/ChainsIds';
import {CanMint} from '../CanMint';
import {MultichainArchitectureDetector} from '../MultichainArchitectureDetector';
import {ChainSubmitArgs} from "../../types/ChainSubmit";
import {SubmitTxChecker} from "../SubmitMonitor/SubmitTxChecker";
import {SubmitSaver} from "../SubmitMonitor/SubmitSaver";
import {Dispatcher} from "./Dispatcher";
import {ExecutedTx, TxHash} from "../../types/Consensus";

@injectable()
export abstract class BlockDispatcher extends Dispatcher implements IBlockChainDispatcher {
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(CanMint) canMint!: CanMint;
  @inject(SubmitTxChecker) submitTxChecker!: SubmitTxChecker;
  @inject(SubmitSaver) submitSaver!: SubmitSaver;
  @inject(ConsensusDataRepository) consensusDataRepository!: ConsensusDataRepository;
  @inject(MultichainArchitectureDetector) multichainArchitectureDetector!: MultichainArchitectureDetector;

  protected chainContract!: ChainContract;

  @postConstruct()
  protected setup(): void {
    this.init();
    this.chainContract = this.chainContractRepository.get(this.chainId);
  }

  getStatus = async (): Promise<[address: string, status: ChainStatus]> => {
    return this.chainContract.resolveStatus();
  };

  apply = async (): Promise<void> => {
    if (!(await this.useDispatcher(this.chainId))) {
      this.logger.info(`${this.logPrefix} OLD chain architecture detected`);
      await sleep(60_000); // slow down execution
      return;
    }

    // NOTICE: KEEP this check at begin, otherwise block minter will be locked
    if (!await this.checkBalanceIsEnough(this.sendingWallet)) {
      await sleep(60_000); // slow down execution
      return ;
    }

    const consensus = await this.consensusDataRepository.read();

    if (!consensus) {
      this.logger.info(`${this.logPrefix} no consensus data found to dispatch`);
      return;
    }

    if (await this.submitTxChecker.apply(this.chainId, consensus.dataTimestamp)) {
      this.logger.info(`${this.logPrefix} Block for ${consensus.dataTimestamp} already submitted`);
      return;
    }

    const [chainAddress, chainStatus] = await this.getStatus();

    if (!this.canMint.apply({dataTimestamp: consensus.dataTimestamp, chainStatus, chainId: this.chainId})) {
      return;
    }

    this.logger.info(
      `${this.logPrefix} Minting a block ${consensus.dataTimestamp} with ${consensus.signatures.length} signatures, ${consensus.leaves.length} leaves, ${consensus.fcdKeys.length} FCDs`,
    );

    const txHash = await this.mint(
      consensus.dataTimestamp,
      consensus.root,
      consensus.fcdKeys,
      consensus.fcdValues,
      consensus.signatures,
      chainStatus,
    );

    if (txHash) {
      this.logger.info(`${this.logPrefix} New Block ${consensus.dataTimestamp} minted with TX ${txHash}`);

      await Promise.all([
        this.submitSaver.apply(this.chainId, consensus.dataTimestamp, txHash),
        this.blockRepository.saveBlock(chainAddress, consensus, true)
      ]);
    } else {
      this.logger.warn(`${this.logPrefix} Block ${consensus.dataTimestamp} was not minted`);
    }
  };

  protected async resolveGasMetrics(): Promise<GasEstimation | undefined> {
    const {minGasPrice, maxGasPrice} = this.blockchain.chainSettings.transactions;
    return this.blockchain.provider.gasEstimation(minGasPrice, maxGasPrice);
  }

  private async submitTxData(
    dataTimestamp: number,
    root: string,
    keys: string[],
    values: HexStringWith0x[],
    signatures: string[],
    chainStatus: ChainStatus,
  ): Promise<{
    fn: () => Promise<ExecutedTx>,
    payableOverrides: PayableOverrides,
    timeout: number
  }> {
    const components = signatures.map((signature) => ethers.utils.splitSignature(signature));

    const chainSubmitArgs: ChainSubmitArgs = {
      dataTimestamp,
      root,
      keys: keys.map(LeafKeyCoder.encode),
      values: values.map((v) => Buffer.from(remove0x(v), 'hex')),
      v: components.map((sig) => sig.v),
      r: components.map((sig) => sig.r),
      s: components.map((sig) => sig.s)
    }

    const payableOverrides = await this.calculatePayableOverrides({
      data: chainSubmitArgs,
      nonce: await this.sendingWallet.getNextNonce()
    });

    this.logger.info(`${this.logPrefix} Submitting tx ${JSON.stringify(payableOverrides)}`);

    const fn = () => this.chainContract.submit(chainSubmitArgs, payableOverrides);

    return {fn, payableOverrides, timeout: Math.max(chainStatus.timePadding * 1000, 300_000)};
  }

  private async mint(
    dataTimestamp: number,
    root: string,
    keys: string[],
    values: HexStringWith0x[],
    signatures: string[],
    chainStatus: ChainStatus,
  ): Promise<TxHash | null> {
    try {
      const {fn, payableOverrides, timeout} = await this.submitTxData(dataTimestamp, root, keys, values, signatures, chainStatus);
      return await this.dispatch(fn, payableOverrides, timeout);
    } catch (e) {
      const err = await this.handleTimestampDiscrepancyError(<Error>e, dataTimestamp);
      this.logger.error(err);
      return null;
    }
  }

  private async handleTimestampDiscrepancyError(e: Error, dataTimestamp: number): Promise<Error> {
    if (!e.message.includes('you can predict the future')) {
      return e;
    }

    const blockTimestamp = await this.blockchain.getBlockTimestamp();
    return new Error(`${this.logPrefix} Timestamp discrepancy ${blockTimestamp - dataTimestamp}s: (${e.message})`);
  }

  private async useDispatcher(chainId: ChainsIds): Promise<boolean> {
    if (chainId == this.settings.blockchain.masterChain.chainId) {
      // homechain is compatible with multichain
      return true;
    }

    return this.multichainArchitectureDetector.apply(chainId);
  }
}
