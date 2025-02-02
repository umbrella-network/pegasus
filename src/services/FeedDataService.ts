import {inject, injectable} from 'inversify';
import {FeedRepository} from '../repositories/FeedRepository.js';
import FeedProcessor from './FeedProcessor.js';
import Settings from '../types/Settings.js';
import {LeavesAndFeeds} from '../types/Consensus.js';
import Leaf from '../types/Leaf.js';
import {Logger} from 'winston';
import {FeedsType} from '../types/Feed.js';
import {DeviationFeeds, DeviationLeavesAndFeeds} from '../types/DeviationFeeds.js';
import {IntervalTriggerFilter} from './deviationsFeeds/IntervalTriggerFilter.js';
import {ChainsIds} from '../types/ChainsIds';

@injectable()
export class FeedDataService {
  @inject('Settings') settings!: Settings;
  @inject(FeedRepository) feedRepository!: FeedRepository;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;
  @inject(IntervalTriggerFilter) intervalTriggerFilter!: IntervalTriggerFilter;
  @inject('Logger') logger!: Logger;

  async apply(
    dataTimestamp: number,
    feedsType: FeedsType,
    filter: string[] = [],
  ): Promise<{feeds: LeavesAndFeeds | DeviationLeavesAndFeeds; rejected?: string}> {
    if (feedsType === FeedsType.DEVIATION_TRIGGER) {
      const {leavesAndFeeds, rejected} = await this.getDeviationLeavesAndFeeds(dataTimestamp, filter);
      return {feeds: leavesAndFeeds, rejected};
    }

    const leavesAndFeeds = await this.getLeavesAndFeeds(dataTimestamp, filter);
    return {feeds: leavesAndFeeds};
  }

  getParamsByFetcherName<T>(data: DeviationLeavesAndFeeds, fetcherName: string): T[] {
    const feeds: DeviationFeeds = data.feeds;

    if (!feeds || Object.keys(feeds).length === 0) {
      return [];
    }

    const fetcherParams = [];

    for (const [, feed] of Object.entries(feeds)) {
      const feedInput = feed.inputs.find((entry) => {
        return entry.fetcher.name === fetcherName;
      });

      if (feedInput) {
        const params = feedInput.fetcher.params as T;
        fetcherParams.push({...params});
      }
    }

    return fetcherParams;
  }

  protected async getLeavesAndFeeds(dataTimestamp: number, filter: string[]): Promise<LeavesAndFeeds> {
    const fcdFeeds = await this.feedRepository.getFcdFeeds(filter);
    const leafFeeds = await this.feedRepository.getLeafFeeds(filter);
    const feeds = [fcdFeeds, leafFeeds];
    const fcdsAndLeaves = await this.feedProcessor.apply(dataTimestamp, ...feeds);

    const firstClassLeaves = this.ensureProperLabelLength(fcdsAndLeaves[0]);
    const leaves = this.ensureProperLabelLength(fcdsAndLeaves[1]);

    return {
      firstClassLeaves: this.ignoreZeros(firstClassLeaves),
      leaves: this.ignoreZeros(leaves),
      fcdsFeeds: fcdFeeds,
      leavesFeeds: leafFeeds,
    };
  }

  protected async getDeviationLeavesAndFeeds(
    dataTimestamp: number,
    filter: string[],
  ): Promise<{leavesAndFeeds: DeviationLeavesAndFeeds; rejected?: string}> {
    const feeds = await this.feedRepository.getDeviationTriggerFeeds(filter);
    const {filteredFeeds, rejected} = await this.intervalTriggerFilter.apply(dataTimestamp, feeds);

    if (Object.keys(filteredFeeds).length == 0) {
      this.logger.debug(`[FeedDataService] nothing trigger at ${dataTimestamp}`);

      return {
        leavesAndFeeds: {leaves: [], feeds: {}},
        rejected,
      };
    }

    const [deviationLeaves] = await this.feedProcessor.apply(dataTimestamp, ...[filteredFeeds]);

    const leaves = this.ensureProperLabelLength(deviationLeaves);

    return {
      leavesAndFeeds: {leaves: this.ignoreZeros(leaves), feeds: filteredFeeds},
      rejected,
    };
  }

  protected ensureProperLabelLength(leaves: Leaf[]): Leaf[] {
    const filtered = leaves.filter((leaf) => leaf.label.length <= 32);

    if (filtered.length !== leaves.length) {
      const invalidLabels = leaves.filter((leaf) => leaf.label.length > 32).map((leaf) => leaf.label);
      this.logger.error(`ignoring too long labels: ${invalidLabels}`);
    }

    return filtered;
  }

  protected ignoreZeros(leaves: Leaf[]): Leaf[] {
    const hashZero = '0x0000000000000000000000000000000000000000000000000000000000000000';

    const filtered = leaves.filter((leaf) => leaf.valueBytes !== hashZero);

    if (filtered.length !== leaves.length) {
      const zeros = leaves.filter((leaf) => leaf.valueBytes === hashZero).map((leaf) => leaf.label);
      this.logger.error(`ignoring zeros: ${zeros}`);
    }

    return filtered;
  }
}
