import {inject, injectable} from 'inversify';
import {Logger} from "winston";

import Leaf from "../../types/Leaf";
import {
  DeviationFeed,
  PriceDataByKey,
  PriceDataPerChain,
  DeviationDataToSign,
  PriceData,
  DeviationFeeds
} from "../../types/DeviationFeeds";
import {PriceTriggerFilter} from "./PriceTriggerFilter";
import {HeartbeatTriggerFilter} from "./HeartbeatTriggerFilter";
import {LeavesToRecord} from "../tools/LeavesToRecord";
import {DeviationFeedsPerChainSplitter} from "./DeviationFeedsPerChainSplitter";
import {DeviationDataToSignFactory} from "../../factories/DeviationDataToSignFactory";
import {DeviationTriggerConsensusRepository} from "../../repositories/DeviationTriggerConsensusRepository";
import {DataFilter} from "../tools/DataFilter";

@injectable()
export class DeviationTriggerFilters {
  @inject('Logger') logger!: Logger;

  @inject(PriceTriggerFilter) protected priceTriggerFilter!: PriceTriggerFilter;
  @inject(DeviationTriggerConsensusRepository) deviationConsensusRepository!: DeviationTriggerConsensusRepository;

  async apply(
    dataTimestamp: number,
    leaves: Leaf[],
    feeds: DeviationFeeds,
    priceDataPerChain: PriceDataPerChain
  ): Promise<DeviationDataToSign | undefined> {
    const leavesByKey = LeavesToRecord.apply(leaves);
    const keysPerChain = DeviationFeedsPerChainSplitter.apply(feeds);

    const pendingChains = await this.deviationConsensusRepository.existedChains();

    const keysToUpdateWithChain = Object.keys(keysPerChain).map(chainId => {
      if (pendingChains.has(chainId)) {
        this.logger.info(`[DeviationTriggerFilters] skipping pending chain ${chainId}`);
        return;
      }

      const chainKeys = keysPerChain[chainId];

      const keysToUpdate = this.applyFiltersForChain(
        dataTimestamp,
        DataFilter.filter(feeds, chainKeys),
        DataFilter.filter(leavesByKey, chainKeys),
        priceDataPerChain[chainId]
      );

      return {chainId, keys: keysToUpdate};
    });

    return DeviationDataToSignFactory.create(dataTimestamp, keysToUpdateWithChain, leavesByKey, feeds);
  }

  protected applyFiltersForChain(
    dataTimestamp: number,
    feedsForChain: DeviationFeeds,
    leaves: Record<string, Leaf>,
    onChainData?: PriceDataByKey
  ): string[] {
    return Object.keys(feedsForChain).filter(key => {
      if (!onChainData || !onChainData[key]) {
        return true;
      }

      if (!leaves[key]) {
        this.logger.error(`[DeviationTriggerFilters] ERROR: there is no leaf for ${key}.`)
        return false;
      }

      return this.checkIfFeedShouldBeUpdated(dataTimestamp, feedsForChain[key], leaves[key], onChainData[key]);
    });
  }

  protected checkIfFeedShouldBeUpdated(dataTimestamp: number, feed: DeviationFeed, leaf: Leaf, priceData: PriceData): boolean {
    if (HeartbeatTriggerFilter.apply(dataTimestamp, feed, priceData)) {
      this.logger.info(`[DeviationTriggerFilters] HeartbeatTriggerFilter applied for ${leaf.label}`);
      return true;
    }

    return this.priceTriggerFilter.apply(feed, leaf, priceData);
  }
}
