import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Leaf from '../../types/Leaf.js';
import {
  DeviationFeed,
  PriceDataByKey,
  PriceDataPerChain,
  DeviationDataToSign,
  PriceData,
  DeviationFeeds,
  FilterResult,
  FilterResultWithKey,
  DeviationTriggerResponse,
} from '../../types/DeviationFeeds.js';
import {PriceTriggerFilter} from './PriceTriggerFilter.js';
import {HeartbeatTriggerFilter} from './HeartbeatTriggerFilter.js';
import {LeavesToRecord} from '../tools/LeavesToRecord.js';
import {DeviationFeedsPerChainSplitter} from './DeviationFeedsPerChainSplitter.js';
import {DeviationDataToSignFactory} from '../../factories/DeviationDataToSignFactory.js';
import {DeviationTriggerConsensusRepository} from '../../repositories/DeviationTriggerConsensusRepository.js';
import {DataFilter} from '../tools/DataFilter.js';

@injectable()
export class DeviationTriggerFilters {
  @inject('Logger') logger!: Logger;

  @inject(PriceTriggerFilter) protected priceTriggerFilter!: PriceTriggerFilter;
  @inject(DeviationTriggerConsensusRepository) deviationConsensusRepository!: DeviationTriggerConsensusRepository;

  async apply(
    dataTimestamp: number,
    leaves: Leaf[],
    feeds: DeviationFeeds,
    priceDataPerChain: PriceDataPerChain,
    pendingChains: Set<string> | undefined,
  ): Promise<DeviationTriggerResponse> {
    const leavesByKey = LeavesToRecord.apply(leaves);
    const keysPerChain = DeviationFeedsPerChainSplitter.apply(feeds);
    const response: DeviationTriggerResponse = {reason: ''};

    const keysToUpdateWithChain = Object.keys(keysPerChain).map((chainId) => {
      if (pendingChains?.has(chainId)) {
        this.logger.info(`[DeviationTriggerFilters] skipping ${chainId}: pending chain update`);
        return;
      }

      const chainKeys = keysPerChain[chainId];

      const {keysToUpdate, logs} = this.applyFiltersForChain(
        dataTimestamp,
        DataFilter.filter(feeds, chainKeys),
        DataFilter.filter(leavesByKey, chainKeys),
        priceDataPerChain[chainId],
      );

      if (logs.length) {
        this.logger.info(`[DeviationTriggerFilters] [${chainId}]: ${logs.join('; ')}`);
        response.reason += `[${chainId}]: ${logs.join('; ')}; `;
      }

      if (keysToUpdate.length) {
        this.logger.info(`[DeviationTriggerFilters] [${chainId}]: keysToUpdate ${keysToUpdate.join(', ')}`);
      }

      return {chainId, keys: keysToUpdate};
    });

    response.dataToUpdate = DeviationDataToSignFactory.create(dataTimestamp, keysToUpdateWithChain, leavesByKey, feeds);

    return response;
  }

  protected applyFiltersForChain(
    dataTimestamp: number,
    feedsForChain: DeviationFeeds,
    leaves: Record<string, Leaf>,
    onChainData?: PriceDataByKey,
  ): {keysToUpdate: string[]; logs: string[]} {
    const results = Object.keys(feedsForChain).map((key): FilterResultWithKey => {
      if (!onChainData) {
        // there was probably some issue with pulling data and there is no data for chain
        return {result: false, key, msg: '!onChainData'};
      }

      if (!onChainData[key]) {
        return {result: true, key, msg: `!onChainData[${key}]`};
      }

      if (!leaves[key]) {
        this.logger.error(`[DeviationTriggerFilters] ERROR: there is no leaf for ${key}.`);
        return {result: false, key, msg: `there is no leaf for ${key}`};
      }

      return {
        ...this.checkIfFeedShouldBeUpdated(dataTimestamp, feedsForChain[key], leaves[key], onChainData[key]),
        key,
      };
    });

    return {
      keysToUpdate: results.filter((data) => data.result).map((data) => data.key),
      logs: results.filter((data) => data.msg).map((data) => data.msg) as string[],
    };
  }

  protected checkIfFeedShouldBeUpdated(
    dataTimestamp: number,
    feed: DeviationFeed,
    leaf: Leaf,
    priceData: PriceData,
  ): FilterResult {
    if (HeartbeatTriggerFilter.apply(dataTimestamp, feed, priceData)) {
      return {result: true, msg: `${leaf.label}: heartbeat`};
    }

    return this.priceTriggerFilter.apply(feed, leaf, priceData);
  }
}
