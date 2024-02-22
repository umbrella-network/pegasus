import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import {DeviationLeavesAndFeeds, DeviationTriggerResponse} from '../../types/DeviationFeeds.js';
import {PriceDataProvider} from './PriceDataProvider.js';
import {DeviationTriggerFilters} from './DeviationTriggerFilters.js';
import {DataFilter} from '../tools/DataFilter.js';
import {DeviationFeedsPerChainSplitter} from './DeviationFeedsPerChainSplitter.js';
import {PriceDataOverflowChecker} from './PriceDataOverflowChecker.js';
import {ChainsId, FeedName} from '../../types/Feed';

@injectable()
export class DeviationTrigger {
  @inject('Logger') logger!: Logger;
  @inject(PriceDataProvider) priceDataProvider!: PriceDataProvider;
  @inject(DeviationTriggerFilters) deviationTriggerFilters!: DeviationTriggerFilters;
  @inject(PriceDataOverflowChecker) priceDataOverflowChecker!: PriceDataOverflowChecker;

  async apply(
    dataTimestamp: number,
    data: DeviationLeavesAndFeeds,
    pendingChains?: Set<string>,
  ): Promise<DeviationTriggerResponse> {
    const {feeds, leaves} = data;

    if (leaves.length === 0) {
      this.logger.debug(`[DeviationTrigger] no leaves to process for ${dataTimestamp}`);
      return {reason: '0 leaves/prices to process'};
    }

    // discard feeds for which we do not have leaves
    const removed = DataFilter.mutate(
      feeds,
      leaves.map((l) => l.label),
    );

    const reasons: string[] = [];

    if (removed.length != 0) {
      this.logger.warn(`[DeviationTrigger] removed feeds (no price): ${removed}`);
      reasons.push(`removed feeds (no price): ${removed}`);
    }

    this.logger.info(`[DeviationTrigger] feeds: ${Object.keys(feeds)}`);

    const keysPerChain: Record<ChainsId, FeedName[]> = DeviationFeedsPerChainSplitter.apply(feeds);

    const priceDataPerChain = await this.priceDataProvider.apply(keysPerChain);

    const triggerResponse = await this.deviationTriggerFilters.apply(
      dataTimestamp,
      leaves,
      feeds,
      priceDataPerChain,
      pendingChains,
    );

    if (triggerResponse.reason) {
      reasons.push(triggerResponse.reason);
    }

    if (!triggerResponse.dataToUpdate || Object.keys(triggerResponse.dataToUpdate.proposedPriceData).length == 0) {
      this.logger.info(`[DeviationTrigger] no data to update for ${dataTimestamp}`);
      return {reason: `no data to update: ${reasons.join(';')}`};
    }

    // TODO in future we might want to remove the invalid data, atm we allow encoder to throw error
    Object.values(triggerResponse.dataToUpdate.proposedPriceData).forEach((data) =>
      this.priceDataOverflowChecker.apply(data),
    );

    return {
      dataToUpdate: triggerResponse.dataToUpdate,
      reason: reasons.join(';'),
    };
  }
}
