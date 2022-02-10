import {inject, injectable} from 'inversify';
import {FeedRepository} from '../repositories/FeedRepository';
import FeedProcessor from './FeedProcessor';
import Settings from '../types/Settings';
import {LeavesAndFeeds} from '../types/Consensus';

@injectable()
export class FeedDataService {
  @inject('Settings') settings!: Settings;
  @inject(FeedRepository) feedRepository!: FeedRepository;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;

  async getLeavesAndFeeds(dataTimestamp: number): Promise<LeavesAndFeeds> {
    const [fcdFeeds, leafFeeds] = await Promise.all([
      this.feedRepository.getFcdFeeds(),
      this.feedRepository.getLeafFeeds(),
    ]);

    const feeds = [fcdFeeds, leafFeeds];
    const [firstClassLeaves, leaves] = await this.feedProcessor.apply(dataTimestamp, ...feeds);
    return {firstClassLeaves, leaves, fcdsFeeds: fcdFeeds, leavesFeeds: leafFeeds};
  }
}
