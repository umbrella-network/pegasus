import {inject, injectable} from 'inversify';
import {FeedRepository} from '../repositories/FeedRepository';
import FeedProcessor from './FeedProcessor';
import Settings from '../types/Settings';
import {LeavesAndFeeds} from '../types/Consensus';

@injectable()
export class ConsensusDataService {
  @inject('Settings') settings!: Settings;
  @inject(FeedRepository) feedRepository!: FeedRepository;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;

  async getLeavesAndFeeds(dataTimestamp: number): Promise<LeavesAndFeeds> {
    const fcdFeeds = await this.feedRepository.getFcdFeeds();
    const leafFeeds = await this.feedRepository.getLeafFeeds();
    const feeds = [fcdFeeds, leafFeeds];
    const [firstClassLeaves, leaves] = await this.feedProcessor.apply(dataTimestamp, ...feeds);
    return {firstClassLeaves, leaves, fcdsFeeds: fcdFeeds, leavesFeeds: leafFeeds};
  }
}