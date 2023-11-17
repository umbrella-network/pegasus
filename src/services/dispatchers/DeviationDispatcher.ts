import {inject, injectable, postConstruct} from 'inversify';
import {ethers} from 'ethers';
import {PayableOverrides} from '@ethersproject/contracts';

import BlockRepository from '../../repositories/BlockRepository.js';
import {MultichainArchitectureDetector} from '../MultichainArchitectureDetector.js';
import {Dispatcher} from './Dispatcher.js';
import {IDeviationFeedsDispatcher} from './IDeviationFeedsDispatcher.js';
import {FeedsContractRepository} from '../../repositories/FeedsContractRepository.js';
import {DeviationTriggerConsensusRepository} from '../../repositories/DeviationTriggerConsensusRepository.js';
import {TriggerTxChecker} from '../SubmitMonitor/TriggerTxChecker.js';
import {TriggerSaver} from '../SubmitMonitor/TriggerSaver.js';
import {UmbrellaFeedsUpdateArgs} from '../../types/DeviationFeeds.js';
import {DeviationConsensus} from '../../models/DeviationConsensus.js';
import {sleep} from '../../utils/sleep.js';
import {DeviationLeaderSelector} from '../deviationsFeeds/DeviationLeaderSelector.js';
import {ValidatorRepository} from '../../repositories/ValidatorRepository.js';
import TimeService from '../TimeService.js';
import {ExecutedTx, TxHash} from '../../types/Consensus.js';
import {UmbrellaFeedInterface} from '../../interfaces/UmbrellaFeedInterface.js';

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
      this.printNotImportantInfo("I'm not a leader atm");
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
      this.printNotImportantInfo('no consensus data found to dispatch');
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
      this.logger.error(`${this.logPrefix} Consensus ${consensus.dataTimestamp} was not saved on blockchain`);

      const updateFeedsArgs: UmbrellaFeedsUpdateArgs = {
        keys: consensus.keys.map(ethers.utils.id),
        priceDatas: consensus.priceData,
        signatures: consensus.signatures,
      };

      this.logger.warn(`${this.logPrefix} ${JSON.stringify(updateFeedsArgs)}`);

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
    } catch (err: unknown) {
      (err as Error).message = `${this.logPrefix} ${(err as Error).message}`;
      this.logger.error(err);
      return null;
    }
  }
}
