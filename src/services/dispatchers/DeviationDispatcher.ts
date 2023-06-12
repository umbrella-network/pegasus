import {inject, injectable, postConstruct} from 'inversify';
import newrelic from 'newrelic';
import {GasEstimator} from '@umb-network/toolbox';
import {TransactionResponse} from '@ethersproject/providers';
import {ethers} from 'ethers';
import {PayableOverrides} from "@ethersproject/contracts";
import {GasEstimation} from "@umb-network/toolbox/dist/types/GasEstimation";

import BlockRepository from '../../repositories/BlockRepository';
import {MultichainArchitectureDetector} from '../MultichainArchitectureDetector';
import {Dispatcher} from "./Dispatcher";
import {IDeviationFeedsDispatcher} from "./IDeviationFeedsDispatcher";
import {FeedContract} from "../../contracts/FeedContract";
import {FeedsContractRepository} from "../../repositories/FeedsContractRepository";
import {DeviationTriggerConsensusRepository} from "../../repositories/DeviationTriggerConsensusRepository";
import {TriggerTxChecker} from "../SubmitMonitor/TriggerTxChecker";
import {TriggerSaver} from "../SubmitMonitor/TriggerSaver";
import { Signature, UmbrellaFeedsUpdateArgs} from "../../types/DeviationFeeds";
import {DeviationConsensus} from "../../models/DeviationConsensus";

@injectable()
export abstract class DeviationDispatcher extends Dispatcher implements IDeviationFeedsDispatcher {
  @inject(FeedsContractRepository) feedsContractRepository!: FeedsContractRepository;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(TriggerTxChecker) triggerTxChecker!: TriggerTxChecker;
  @inject(TriggerSaver) triggerSaver!: TriggerSaver;
  @inject(DeviationTriggerConsensusRepository) consensusRepository!: DeviationTriggerConsensusRepository;
  @inject(MultichainArchitectureDetector) multichainArchitectureDetector!: MultichainArchitectureDetector;

  protected feedsContract!: FeedContract;
  protected logPrefix = '[DeviationDispatcher]';

  @postConstruct()
  protected setup(): void {
    this.logPrefix = `[${this.chainId}][DeviationDispatcher]`;
    this.feedsContract = this.feedsContractRepository.get(this.chainId);
    this.blockchain = this.blockchainRepository.get(this.chainId);
  }

  apply = async (): Promise<void> => {
    if (!this.blockchain.deviationWallet) {
      this.logger.warn(`${this.logPrefix} no wallet`);
      return;
    }

    const consensus = await this.consensusRepository.read(this.chainId);

    if (!consensus) {
      this.logger.info(`${this.logPrefix} no consensus data found to dispatch`);
      return;
    }

    await this.checkBalanceIsEnough(this.blockchain.deviationWallet);

    if (await this.triggerTxChecker.apply(this.chainId, consensus.dataTimestamp)) {
      this.logger.info(`${this.logPrefix} Feeds for ${consensus.dataTimestamp} already submitted`);
      return;
    }

    this.logger.info(`${this.logPrefix} Trigger TX at ${consensus.dataTimestamp} for ${consensus.keys}`);

    const txHash = await this.send(consensus);

    if (txHash) {
      this.logger.info(`${this.logPrefix} TX ${txHash}`);

      await Promise.all([
        this.triggerSaver.apply(this.chainId, consensus.dataTimestamp, txHash),
        this.consensusRepository.delete(this.chainId)
      ]);
    } else {
      this.logger.warn(`${this.logPrefix} Consensus ${consensus.dataTimestamp} was not saved on blockchain`);
    }
  };

  protected async resolveGasMetrics(): Promise<GasEstimation | undefined> {
    const {minGasPrice, maxGasPrice} = this.blockchain.chainSettings.transactions;
    return GasEstimator.apply(this.blockchain.provider, minGasPrice, maxGasPrice);
  }

  protected async updateFeedsTxData(consensus: DeviationConsensus): Promise<{
    fn: () => Promise<TransactionResponse>,
    payableOverrides: PayableOverrides,
    timeout: number
  }> {
    const signatures = consensus.signatures
      .map((signature) => ethers.utils.splitSignature(signature))
      .map((s): Signature => {
        return <Signature>{
          v: s.v,
          r: s.r,
          s: s.s
        }
      });

    const updateFeedsArgs: UmbrellaFeedsUpdateArgs = {
      keys: consensus.keys.map(ethers.utils.id),
      priceDatas: consensus.priceData,
      signatures
    };

    const payableOverrides = await this.calculatePayableOverrides({data: updateFeedsArgs});

    this.logger.info(`${this.logPrefix} sending updating tx ${JSON.stringify(payableOverrides)}`);

    const fn = () => this.feedsContract.update(updateFeedsArgs, payableOverrides);

    return {fn, payableOverrides, timeout: 120_000};
  }

  protected async send(consensus: DeviationConsensus): Promise<string | null> {
    try {
      const {fn, payableOverrides, timeout} = await this.updateFeedsTxData(consensus);
      return await this.dispatch(fn, payableOverrides, timeout);
    } catch (err) {
      newrelic.noticeError(err);
      this.logger.error(err);
      return null;
    }
  }
}
