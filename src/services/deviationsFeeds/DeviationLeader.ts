import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import TimeService from '../TimeService.js';
import {DeviationConsensusRunner} from './DeviationConsensusRunner.js';
import {ValidatorRepository} from '../../repositories/ValidatorRepository.js';
import {FeedsContractRepository} from '../../repositories/FeedsContractRepository.js';
import {DeviationTriggerConsensusRepository} from '../../repositories/DeviationTriggerConsensusRepository.js';
import Settings, {BlockchainType} from '../../types/Settings.js';
import {DeviationTrigger} from './DeviationTrigger.js';
import {FeedsType} from '../../types/Feed.js';
import {DeviationLeavesAndFeeds} from '../../types/DeviationFeeds.js';
import {FeedDataService} from '../FeedDataService.js';
import {DeviationLeaderSelector} from './DeviationLeaderSelector.js';
import {DeviationTriggerLastIntervals} from '../../repositories/DeviationTriggerLastIntervals.js';
import {sleep} from '../../utils/sleep.js';
import {BalanceMonitorChecker} from '../balanceMonitor/BalanceMonitorChecker.js';
import {RequiredSignaturesRepository} from '../../repositories/RequiredSignaturesRepository.js';

@injectable()
export class DeviationLeader {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(TimeService) timeService!: TimeService;
  @inject(FeedDataService) feedDataService!: FeedDataService;
  @inject(ValidatorRepository) validatorRepository!: ValidatorRepository;
  @inject(FeedsContractRepository) feedsContractRepository!: FeedsContractRepository;
  @inject(DeviationConsensusRunner) consensusRunner!: DeviationConsensusRunner;
  @inject(DeviationTriggerConsensusRepository) deviationConsensusRepository!: DeviationTriggerConsensusRepository;
  @inject(DeviationTrigger) deviationTrigger!: DeviationTrigger;
  @inject(DeviationLeaderSelector) deviationLeaderSelector!: DeviationLeaderSelector;
  @inject(DeviationTriggerLastIntervals) deviationTriggerLastIntervals!: DeviationTriggerLastIntervals;
  @inject(BalanceMonitorChecker) balanceMonitorChecker!: BalanceMonitorChecker;
  @inject(RequiredSignaturesRepository) requiredSignaturesRepository!: RequiredSignaturesRepository;

  private logPrefix = '[DeviationLeader]';

  async apply(): Promise<void> {
    if (!(await this.balanceMonitorChecker.apply(BlockchainType.ON_CHAIN))) {
      this.logger.error(`${this.logPrefix}[ON_CHAIN] There is not enough balance in any of the chains`);
      await sleep(60_000); // slow down execution
      return;
    }

    // assumption: we have same requirements for each chain (same number of required signatures)
    const requiredSignatures = await this.requiredSignaturesRepository.get(BlockchainType.ON_CHAIN, undefined);

    if (!requiredSignatures) {
      // we do not set last intervals if we didn't manage to get consensus
      this.logger.error(`${this.logPrefix} unknown requiredSignatures`);
      return;
    }

    const dataTimestamp = this.timeService.apply();

    const [validators, pendingChains] = await Promise.all([
      this.validatorRepository.list(undefined, BlockchainType.ON_CHAIN),
      this.deviationConsensusRepository.existedChains(),
    ]);

    if (validators.length === 0) throw new Error(`${this.logPrefix} validators list is empty`);

    if (!this.deviationLeaderSelector.apply(dataTimestamp, validators)) {
      this.logger.debug(`${this.logPrefix} I'm not a leader at ${dataTimestamp}`);
      return;
    }

    // interval filter is applied in feedDataService
    const data = await this.feedDataService.apply(dataTimestamp, FeedsType.DEVIATION_TRIGGER);

    if (data.rejected) {
      this.logger.info(`${this.logPrefix} rejected: ${data.rejected}`);
    }

    const {dataToUpdate} = await this.deviationTrigger.apply(
      dataTimestamp,
      data.feeds as DeviationLeavesAndFeeds,
      pendingChains,
    );

    if (!dataToUpdate) {
      await this.deviationTriggerLastIntervals.set(Object.keys(data.feeds), dataTimestamp);
      this.logger.debug(`${this.logPrefix} no data to update at ${dataTimestamp}`);
      return;
    }

    const consensuses = await this.consensusRunner.apply(dataToUpdate, validators, requiredSignatures);

    if (!consensuses) {
      // we do not set last intervals if we didn't manage to get consensus
      this.logger.warn(`${this.logPrefix} no consensus for ${JSON.stringify(dataToUpdate.feedsForChain)}`);
      return;
    }

    this.logger.debug(`${this.logPrefix} got ${consensuses.length} consensus(es)`);

    await Promise.all([
      this.deviationTriggerLastIntervals.set(Object.keys(data.feeds), dataTimestamp),
      ...consensuses.map((consensus) => this.deviationConsensusRepository.save(consensus)),
    ]);

    this.logger.debug(`${this.logPrefix} finished`);
  }
}
