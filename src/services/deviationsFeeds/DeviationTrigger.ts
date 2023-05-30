import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import {FeedsType} from '../../types/Feed';
import {FeedDataService} from '../FeedDataService';
import {DeviationLeavesAndFeeds} from '../../types/DeviationFeeds';
import TimeService from '../TimeService';
import {PriceDataProvider} from "./PriceDataProvider";
import {DeviationTriggerFilters} from "./DeviationTriggerFilters";
import {DeviationConsensusRunner} from "./DeviationConsensusRunner";
import {ValidatorRepository} from "../../repositories/ValidatorRepository";
import {FeedsContractRepository} from "../../repositories/FeedsContractRepository";
import {Promise} from "mongoose";
import {DeviationTriggerConsensusRepository} from "../../repositories/DeviationTriggerConsensusRepository";
import {DataFilter} from "../tools/DataFilter";
import {DeviationFeedsPerChainSplitter} from "./DeviationFeedsPerChainSplitter";
import {PriceDataOverflowChecker} from "./PriceDataOverflowChecker";
import {DeviationTriggerLastIntervals} from "../../repositories/DeviationTriggerLastIntervals";

@injectable()
export class DeviationTrigger {
  @inject('Logger') logger!: Logger;
  @inject(TimeService) timeService!: TimeService;
  @inject(FeedDataService) feedDataService!: FeedDataService;
  @inject(PriceDataProvider) priceDataProvider!: PriceDataProvider;
  @inject(DeviationTriggerFilters) deviationTriggerFilters!: DeviationTriggerFilters;
  @inject(ValidatorRepository) validatorRepository!: ValidatorRepository;
  @inject(FeedsContractRepository) feedsContractRepository!: FeedsContractRepository;
  @inject(DeviationConsensusRunner) consensusRunner!: DeviationConsensusRunner;
  @inject(DeviationTriggerConsensusRepository) deviationConsensusRepository!: DeviationTriggerConsensusRepository;
  @inject(PriceDataOverflowChecker) priceDataOverflowChecker!: PriceDataOverflowChecker;
  @inject(DeviationTriggerLastIntervals) deviationTriggerLastIntervals!: DeviationTriggerLastIntervals;

  async apply(): Promise<void> {
    const dataTimestamp = this.timeService.apply();

    // interval filter is applied in feedDataService
    const {feeds, leaves} = (await this.feedDataService.apply(
      dataTimestamp,
      FeedsType.DEVIATION_TRIGGER
    )) as DeviationLeavesAndFeeds;

    if (leaves.length === 0) {
      this.logger.info(`[DeviationTrigger] no leaves to process for ${dataTimestamp}`);
      return;
    }

    // discard feeds for which we do not have leaves
    const removed = DataFilter.mutate(feeds, leaves.map(l => l.label));

    if (removed.length != 0) {
      this.logger.info(`[DeviationTrigger] removed feeds (no price): ${removed}`);
    }

    this.logger.info(`[DeviationTrigger] feeds: ${Object.keys(feeds)}`);

    const keysPerChain = DeviationFeedsPerChainSplitter.apply(feeds);

    const [priceDataPerChain] = await Promise.all([
      this.priceDataProvider.apply(keysPerChain),
      this.deviationTriggerLastIntervals.set(Object.keys(feeds), dataTimestamp)
    ]);

    const dataToUpdate = await this.deviationTriggerFilters.apply(dataTimestamp, leaves, feeds, priceDataPerChain);

    if (!dataToUpdate || Object.keys(dataToUpdate.proposedPriceData).length == 0) {
      this.logger.info(`[DeviationTrigger] no data to update for ${dataTimestamp}`);
      return;
    }

    // TODO in future we might want to remove the invalid data, atm we allow encoder to throw error
    Object.values(dataToUpdate.proposedPriceData).forEach(data => this.priceDataOverflowChecker.apply(data));

    // assumption: we have same requirements for each chain (same number of required signatures)
    const [chainId] = Object.keys(dataToUpdate.feedsForChain);

    const [requiredSignatures, validators] = await Promise.all([
      this.feedsContractRepository.get(chainId).requiredSignatures(),
      this.validatorRepository.list()
    ]);

    if (validators.length === 0) throw new Error('validators list is empty');

    const consensuses = await this.consensusRunner.apply(dataToUpdate, validators, requiredSignatures);

    if (!consensuses) {
      this.logger.warn(`[DeviationTrigger] no consensus for ${JSON.stringify(dataToUpdate.feedsForChain)}`);
      return;
    }

    this.logger.info(`[DeviationTrigger] got ${consensuses.length} consensus(es)`);

    await Promise.all(consensuses.map(consensus => this.deviationConsensusRepository.save(consensus)));

    this.logger.info(`[DeviationTrigger] finished`);
  }
}
