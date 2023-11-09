import {inject, injectable, postConstruct} from 'inversify';
import {ethers} from 'ethers';
import {PayableOverrides} from '@ethersproject/contracts';

import BlockRepository from '../../repositories/BlockRepository';
import {MultichainArchitectureDetector} from '../MultichainArchitectureDetector';
import {Dispatcher} from './Dispatcher';
import {IDeviationFeedsDispatcher} from './IDeviationFeedsDispatcher';
import {FeedContract} from '../../blockchains/evm/contracts/FeedContract';
import {FeedsContractRepository} from '../../repositories/FeedsContractRepository';
import {DeviationTriggerConsensusRepository} from '../../repositories/DeviationTriggerConsensusRepository';
import {TriggerTxChecker} from '../SubmitMonitor/TriggerTxChecker';
import {TriggerSaver} from '../SubmitMonitor/TriggerSaver';
import {UmbrellaFeedsUpdateArgs} from '../../types/DeviationFeeds';
import {DeviationConsensus} from '../../models/DeviationConsensus';
import {sleep} from '../../utils/sleep';
import {DeviationLeaderSelector} from '../deviationsFeeds/DeviationLeaderSelector';
import {ValidatorRepository} from '../../repositories/ValidatorRepository';
import TimeService from '../TimeService';
import {ExecutedTx, TxHash} from '../../types/Consensus';
import {UmbrellaFeedInterface} from '../../interfaces/UmbrellaFeedInterface';

@injectable()
export abstract class DeviationDispatcher extends Dispatcher implements IDeviationFeedsDispatcher {
  @inject(FeedsContractRepository) feedsContractRepository!: FeedsContractRepository;
  @inject(BlockRepository) blockRepository!: BlockRepository;
  @inject(TriggerTxChecker) triggerTxChecker!: TriggerTxChecker;
  @inject(TriggerSaver) triggerSaver!: TriggerSaver;
  @inject(DeviationTriggerConsensusRepository) consensusRepository!: DeviationTriggerConsensusRepository;
  @inject(MultichainArchitectureDetector) multichainArchitectureDetector!: MultichainArchitectureDetector;
  @inject(DeviationLeaderSelector) deviationLeaderSelector!: DeviationLeaderSelector;
  @inject(ValidatorRepository) validatorRepository!: ValidatorRepository;
  @inject(TimeService) timeService!: TimeService;

  protected feedsContract!: UmbrellaFeedInterface;

  @postConstruct()
  protected setup(): void {
    this.init();
    this.feedsContract = this.feedsContractRepository.get(this.chainId);
  }

  apply = async (): Promise<void> => {
    if (!this.blockchain.deviationWallet) {
      this.logger.error(`${this.logPrefix} no wallet`);
      return;
    }

    if (!(await this.amILeader())) {
      this.logger.info(`${this.logPrefix} I'm not a leader atm`);
      await this.consensusRepository.delete(this.chainId);
      return;
    }

    // NOTICE: KEEP this check at begin, otherwise leader worker will be locked
    if (!(await this.checkBalanceIsEnough(this.blockchain.deviationWallet))) {
      await sleep(60_000); // slow down execution
      return;
    }

    const consensus = await this.consensusRepository.read(this.chainId);

    if (!consensus) {
      this.logger.info(`${this.logPrefix} no consensus data found to dispatch`);
      return;
    }

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
        this.consensusRepository.delete(this.chainId),
      ]);
    } else {
      this.logger.warn(`${this.logPrefix} Consensus ${consensus.dataTimestamp} was not saved on blockchain`);
      await sleep(15_000); // slow down execution
    }
  };

  protected async amILeader(): Promise<boolean> {
    const dataTimestamp = this.timeService.apply();
    const validators = await this.validatorRepository.list(undefined);

    if (validators.length === 0) throw new Error('validators list is empty');

    return this.deviationLeaderSelector.apply(
      dataTimestamp,
      validators.map((v) => v.id),
    );
  }

  protected async updateFeedsTxData(consensus: DeviationConsensus): Promise<{
    fn: () => Promise<ExecutedTx>;
    payableOverrides: PayableOverrides;
    timeout: number;
  }> {
    const updateFeedsArgs: UmbrellaFeedsUpdateArgs = {
      keys: consensus.keys.map(ethers.utils.id),
      priceDatas: consensus.priceData,
      signatures: consensus.signatures,
    };

    const payableOverrides = await this.calculatePayableOverrides({
      data: updateFeedsArgs,
      nonce: await this.nextNonce(),
    });

    const {gasMultiplier} = this.blockchain.chainSettings.transactions;
    this.logger.info(`${this.logPrefix} sending update() ${JSON.stringify(payableOverrides)} x${gasMultiplier}`);

    const fn = () => this.feedsContract.update(updateFeedsArgs, payableOverrides);

    return {fn, payableOverrides, timeout: this.getTxTimeout()};
  }

  protected async nextNonce(): Promise<number | undefined> {
    return this.blockchain.deviationWallet?.getNextNonce();
  }

  protected getTxTimeout(): number {
    return 120_000;
  }

  protected async send(consensus: DeviationConsensus): Promise<TxHash | null> {
    try {
      const {fn, payableOverrides, timeout} = await this.updateFeedsTxData(consensus);
      return await this.dispatch(fn, payableOverrides, timeout);
    } catch (err) {
      err.message = `${this.logPrefix} ${err.message}`;
      this.logger.error(err);
      return null;
    }
  }
}
