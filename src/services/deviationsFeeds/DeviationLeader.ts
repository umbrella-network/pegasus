import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import TimeService from '../TimeService';
import {DeviationConsensusRunner} from './DeviationConsensusRunner';
import {ValidatorRepository} from '../../repositories/ValidatorRepository';
import {FeedsContractRepository} from '../../repositories/FeedsContractRepository';
import {DeviationTriggerConsensusRepository} from '../../repositories/DeviationTriggerConsensusRepository';
import Settings, {BlockchainType} from '../../types/Settings';
import {DeviationTrigger} from './DeviationTrigger';
import {FeedsType} from '../../types/Feed';
import {DeviationLeavesAndFeeds} from '../../types/DeviationFeeds';
import {FeedDataService} from '../FeedDataService';
import {DeviationLeaderSelector} from './DeviationLeaderSelector';
import {DeviationTriggerLastIntervals} from '../../repositories/DeviationTriggerLastIntervals';
import {sleep} from '../../utils/sleep';
import {BalanceMonitorChecker} from '../balanceMonitor/BalanceMonitorChecker';
import {RequiredSignaturesRepository} from '../../repositories/RequiredSignaturesRepository';

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

  async apply(): Promise<void> {
    if (!(await this.balanceMonitorChecker.apply(BlockchainType.ON_CHAIN))) {
      this.logger.error(
        `[DeviationLeader] There is not enough balance in any of the chains for ${BlockchainType.ON_CHAIN}`,
      );
      await sleep(60_000); // slow down execution
      return;
    }

    // assumption: we have same requirements for each chain (same number of required signatures)
    const requiredSignatures = await this.requiredSignaturesRepository.get(BlockchainType.ON_CHAIN, undefined);

    if (!requiredSignatures) {
      // we do not set last intervals if we didn't manage to get consensus
      this.logger.error('[DeviationLeader] unknown requiredSignatures');
      return;
    }

    const dataTimestamp = this.timeService.apply();

    const [validators, pendingChains] = await Promise.all([
      this.validatorRepository.list(undefined),
      this.deviationConsensusRepository.existedChains(),
    ]);

    if (validators.length === 0) throw new Error('validators list is empty');

    if (
      !this.deviationLeaderSelector.apply(
        dataTimestamp,
        validators.map((v) => v.id),
      )
    ) {
      this.logger.debug(`[DeviationLeader] I'm not a leader at ${dataTimestamp}`);
      return;
    }

    // interval filter is applied in feedDataService
    const data = (await this.feedDataService.apply(
      dataTimestamp,
      FeedsType.DEVIATION_TRIGGER,
    )) as DeviationLeavesAndFeeds;

    const dataToUpdate = await this.deviationTrigger.apply(dataTimestamp, data, pendingChains);

    if (!dataToUpdate) {
      await this.deviationTriggerLastIntervals.set(Object.keys(data.feeds), dataTimestamp);
      this.logger.debug(`[DeviationLeader] no data to update at ${dataTimestamp}`);
      return;
    }

    const consensuses = await this.consensusRunner.apply(dataToUpdate, validators, requiredSignatures);

    if (!consensuses) {
      // we do not set last intervals if we didn't manage to get consensus
      this.logger.warn(`[DeviationLeader] no consensus for ${JSON.stringify(dataToUpdate.feedsForChain)}`);
      return;
    }

    this.logger.info(`[DeviationLeader] got ${consensuses.length} consensus(es)`);

    await Promise.all([
      this.deviationTriggerLastIntervals.set(Object.keys(data.feeds), dataTimestamp),
      ...consensuses.map((consensus) => this.deviationConsensusRepository.save(consensus)),
    ]);

    this.logger.debug('[DeviationLeader] finished');
  }
}
