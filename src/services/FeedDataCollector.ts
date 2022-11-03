import {inject, injectable} from 'inversify';
import {FeedRepository} from '../repositories/FeedRepository';
import FeedDataProcessor from './FeedDataProcessor';
import Settings from '../types/Settings';
import {PriceRepository} from '../repositories/PriceRepository';
import {DatumRepository} from '../repositories/DatumRepository';
import {Logger} from 'winston';
import Feeds, {FeedInput} from '../types/Feed';

@injectable()
export class FeedDataCollector {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  @inject(FeedRepository) feedRepository!: FeedRepository;
  @inject(FeedDataProcessor) feedDataProcessor!: FeedDataProcessor;
  @inject(PriceRepository) priceRepository!: PriceRepository;
  @inject(DatumRepository) datumRepository!: DatumRepository;

  async run(): Promise<void> {
    const [fcdFeeds, leafFeeds] = await Promise.all([
      this.feedRepository.getFcdFeeds(),
      this.feedRepository.getLeafFeeds(),
    ]);

    if (!Object.keys(fcdFeeds).length && !Object.keys(leafFeeds).length) {
      this.logger.error('[FeedDataCollector] FCD and L2D feeds are empty');
      return;
    }

    const feeds = this.mergeFeedHttpInputs(fcdFeeds, leafFeeds);

    const timestamp = Math.floor(Date.now() / 1000);

    const {data, prices} = await this.feedDataProcessor.apply(timestamp, feeds);

    await Promise.all([this.priceRepository.saveBatch(prices), this.datumRepository.saveBatch(data)]);
  }

  private mergeFeedHttpInputs(...feeds: Feeds[]): Feeds {
    const uniqueFeeds: Feeds = {};

    feeds.forEach((feed) => {
      Object.keys(feed).forEach((key: string) => {
        feed[key].inputs.forEach((input) => {
          if (this.hasWSFetcher(input)) {
            return;
          }

          if (!uniqueFeeds[key]) {
            uniqueFeeds[key] = {discrepancy: feed[key].discrepancy, precision: feed[key].precision, inputs: []};
          }

          if (!uniqueFeeds[key].inputs.some((feed) => this.hasSameFetcher(feed, input))) {
            uniqueFeeds[key].inputs.push(input);
          }
        });
      });
    });

    return uniqueFeeds;
  }

  private hasSameFetcher(uniqueFeed: FeedInput, input: FeedInput): boolean {
    return uniqueFeed.fetcher.name === input.fetcher.name;
  }

  private hasWSFetcher(input: FeedInput): boolean {
    const wsFetchers = ['CryptoComparePriceWS', 'PolygonIOCryptoPrice', 'PolygonIOStockPrice', 'PolygonIOPrice'];

    return wsFetchers.includes(input.fetcher.name);
  }
}