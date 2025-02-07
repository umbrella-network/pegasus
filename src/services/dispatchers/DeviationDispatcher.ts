import {inject, injectable, postConstruct} from 'inversify';
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
import {ChainsIds} from '../../types/ChainsIds.js';

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

    if (this.isConsensusDeprecated(consensus.chainId, consensus.dataTimestamp)) {
      this.logger.warn(`${this.logPrefix} consensus for ${consensus.keys} at ${consensus.dataTimestamp} deprecated`);
      this.logger.debug(`${this.logPrefix} consensus dump ${JSON.stringify(consensus)}`);
      await this.consensusRepository.delete(this.chainId);
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
        keys: consensus.keys,
        priceDatas: consensus.priceData,
        signatures: consensus.signatures,
      };

      this.logger.info(`${this.logPrefix} dump: ${JSON.stringify(updateFeedsArgs)}`);

      await sleep(15_000); // slow down execution
    }
  };

  protected async updateFeedsTxData(consensus: DeviationConsensus): Promise<{
    fn: () => Promise<ExecutedTx>;
    payableOverrides: PayableOverrides;
    timeout: number;
  }> {
    const updateFeedsArgs: UmbrellaFeedsUpdateArgs = {
      keys: consensus.keys,
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

  protected async nextNonce(): Promise<bigint | undefined> {
    return this.blockchain.deviationWallet?.getNextNonce();
  }

  protected getTxTimeout(): number {
    return 120_000;
  }

  protected isConsensusDeprecated(chainId: string, consensusDataTimestamp: number): boolean {
    const roundLengthSeconds = this.settings.deviationTrigger.roundLengthSeconds;
    const beginOfTheRound = Math.trunc(consensusDataTimestamp / roundLengthSeconds) * roundLengthSeconds;

    this.logger.debug(`${chainId}][isConsensusDeprecated] ${beginOfTheRound}, ${consensusDataTimestamp}`);
    // we have 1/2 of next round to send tx if our round is over
    const offset = chainId == ChainsIds.CONCORDIUM ? 3 : 1.5;
    return beginOfTheRound + roundLengthSeconds * offset < this.timeService.apply();
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
