import {inject, injectable} from 'inversify';
import {FeedRepository} from '../repositories/FeedRepository';
import FeedProcessor from './FeedProcessor';
import Settings from '../types/Settings';
import {LeavesAndFeeds} from '../types/Consensus';
import Leaf from '../types/Leaf';
import {Logger} from 'winston';

@injectable()
export class FeedDataService {
  @inject('Settings') settings!: Settings;
  @inject(FeedRepository) feedRepository!: FeedRepository;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;
  @inject('Logger') logger!: Logger;

  async getLeavesAndFeeds(dataTimestamp: number): Promise<LeavesAndFeeds> {
    const fcdFeeds = await this.feedRepository.getFcdFeeds();
    const leafFeeds = await this.feedRepository.getLeafFeeds();
    const feeds = [fcdFeeds, leafFeeds];
    const fcdsAndLeaves = await this.feedProcessor.apply(dataTimestamp, ...feeds);

    const firstClassLeaves = this.ensureProperLabelLength(fcdsAndLeaves[0]);
    const leaves = this.ensureProperLabelLength(fcdsAndLeaves[1]);

    return {firstClassLeaves, leaves, fcdsFeeds: fcdFeeds, leavesFeeds: leafFeeds};
  }

  private ensureProperLabelLength(leaves: Leaf[]): Leaf[] {
    const filtered = leaves.filter((leaf) => leaf.label.length <= 32);

    if (filtered.length !== leaves.length) {
      const invalidLabels = leaves.filter((leaf) => leaf.label.length > 32).map((leaf) => leaf.label);
      this.logger.error(`ignoring too long labels: ${invalidLabels}`);
    }

    return filtered;
  }
}
