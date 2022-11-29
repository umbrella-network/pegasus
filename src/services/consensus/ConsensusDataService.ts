import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {LeavesAndFeeds} from '../../types/Consensus';
import {FeedRepository} from '../../repositories/FeedRepository';
import Leaf from '../../types/Leaf';
import {FeedDataLoader} from './FeedDataLoader';
import Feeds, {Feed} from '../../types/Feed';
import {ConsensusDataGenerator} from './ConsensusDataGenerator';
import dayjs from 'dayjs';
import Settings from '../../types/Settings';

@injectable()
export class ConsensusDataService {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(FeedRepository) feedRepository!: FeedRepository;
  @inject(FeedDataLoader) feedDataLoader!: FeedDataLoader;
  @inject(ConsensusDataGenerator) consensusDataGenerator!: ConsensusDataGenerator;

  async getLeavesAndFeeds(timestamp: number): Promise<LeavesAndFeeds> {
    const [fcdFeeds, leafFeeds] = await this.getActiveFeedMaps();
    const feeds = this.joinFeedMaps([fcdFeeds, leafFeeds]);
    const data = await this.feedDataLoader.apply({feeds, timestamp});
    console.log('[ConsesusDataService] data: ', JSON.stringify(data));
    console.log('[ConsesusDataService] feeds: ', JSON.stringify(feeds));
    const consensusData = await this.consensusDataGenerator.apply({feeds, data});
    const firstClassLeaves = this.filterLeaves(consensusData, fcdFeeds);
    console.log('[ConsesusDataService] firstClassLeaves: ', JSON.stringify(firstClassLeaves));
    const leaves = this.filterLeaves(consensusData, leafFeeds);
    console.log('[ConsesusDataService] consensusData: ', JSON.stringify(consensusData));
    console.log('[ConsesusDataService] leafFeeds: ', JSON.stringify(leafFeeds));
    console.log('[ConsesusDataService] leaves: ', JSON.stringify(leaves));
    return {firstClassLeaves, leaves, fcdsFeeds: fcdFeeds, leavesFeeds: leafFeeds};
  }

  private async getActiveFeedMaps(): Promise<Feeds[]> {
    return Promise.all([this.feedRepository.getFcdFeeds(), this.feedRepository.getLeafFeeds()]);
  }

  private joinFeedMaps(feedMaps: Feeds[]): Feed[] {
    const uniqueFeeds: Feed[] = [];

    feedMaps.forEach((feed: Feeds) => {
      Object.keys(feed).forEach((key: string) => {
        uniqueFeeds.push({symbol: key, ...JSON.parse(JSON.stringify(feed[key]))});
      });
    });

    return uniqueFeeds;
  }

  // This is inefficient, but necessary to maintain the output format of this service.
  // We should re-consider whether this separation is necessary in this step.
  // The computational cost is also relatively small, even though we iterate over the input array twice.
  private filterLeaves(consensusData: Leaf[], feeds: Feeds): Leaf[] {
    const symbols = new Set<string>(Object.keys(feeds));
    return consensusData.filter((leaf) => symbols.has(leaf.label));
  }
}
