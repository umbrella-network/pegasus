import {inject, injectable} from 'inversify';
import {FeedRepository} from '../repositories/FeedRepository';
import FeedProcessor from './FeedProcessor';
import Settings from '../types/Settings';
import {LeavesAndFeeds} from '../types/Consensus';
import Leaf from '../types/Leaf';
import {Logger} from 'winston';
import {FeedsType} from '../types/Feed';
import {DeviationLeavesAndFeeds} from '../types/DeviationFeeds';
import {IntervalTriggerFilter} from './deviationsFeeds/IntervalTriggerFilter';

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
  ): Promise<LeavesAndFeeds | DeviationLeavesAndFeeds> {
    if (feedsType === FeedsType.DEVIATION_TRIGGER) {
      return this.getDeviationLeavesAndFeeds(dataTimestamp, filter);
    }

    return this.getLeavesAndFeeds(dataTimestamp, filter);
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
  ): Promise<DeviationLeavesAndFeeds> {
    const feeds = await this.feedRepository.getDeviationTriggerFeeds(filter);
    const filteredFeeds = await this.intervalTriggerFilter.apply(dataTimestamp, feeds);

    if (Object.keys(filteredFeeds).length == 0) {
      this.logger.info(`[FeedDataService] intervalTriggerFilter@${dataTimestamp}`);

      return {
        leaves: [],
        feeds: {},
      };
    }

    const [deviationLeaves] = await this.feedProcessor.apply(dataTimestamp, ...[filteredFeeds]);

    const leaves = this.ensureProperLabelLength(deviationLeaves);

    return {
      leaves: this.ignoreZeros(leaves),
      feeds: filteredFeeds,
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
