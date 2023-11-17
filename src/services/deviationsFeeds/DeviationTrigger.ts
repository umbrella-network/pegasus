import {Logger} from 'winston';
import {inject, injectable} from 'inversify';

import {DeviationDataToSign, DeviationLeavesAndFeeds} from '../../types/DeviationFeeds.js';
import {PriceDataProvider} from './PriceDataProvider.js';
import {DeviationTriggerFilters} from './DeviationTriggerFilters.js';
import {DataFilter} from '../tools/DataFilter.js';
import {DeviationFeedsPerChainSplitter} from './DeviationFeedsPerChainSplitter.js';
import {PriceDataOverflowChecker} from './PriceDataOverflowChecker.js';

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
  ): Promise<DeviationDataToSign | undefined> {
    const {feeds, leaves} = data;

    if (leaves.length === 0) {
      this.logger.debug(`[DeviationTrigger] no leaves to process for ${dataTimestamp}`);
      return;
    }

    // discard feeds for which we do not have leaves
    const removed = DataFilter.mutate(
      feeds,
      leaves.map((l) => l.label),
    );

    if (removed.length != 0) {
      this.logger.warn(`[DeviationTrigger] removed feeds (no price): ${removed}`);
    }

    this.logger.info(`[DeviationTrigger] feeds: ${Object.keys(feeds)}`);

    const keysPerChain = DeviationFeedsPerChainSplitter.apply(feeds);

    const priceDataPerChain = await this.priceDataProvider.apply(keysPerChain);

    const dataToUpdate = await this.deviationTriggerFilters.apply(
      dataTimestamp,
      leaves,
      feeds,
      priceDataPerChain,
      pendingChains,
    );

    if (!dataToUpdate || Object.keys(dataToUpdate.proposedPriceData).length == 0) {
      this.logger.info(`[DeviationTrigger] no data to update for ${dataTimestamp}`);
      return;
    }

    // TODO in future we might want to remove the invalid data, atm we allow encoder to throw error
    Object.values(dataToUpdate.proposedPriceData).forEach((data) => this.priceDataOverflowChecker.apply(data));

    return dataToUpdate;
  }
}
