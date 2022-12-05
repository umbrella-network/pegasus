import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {FeedRepository} from '../repositories/FeedRepository';
import FeedDataProcessor from './FeedDataProcessor';
import Settings from '../types/Settings';
import Feeds, {FeedInput} from '../types/Feed';
import {PriceService} from './PriceService';
import {DatumRepository} from '../repositories/DatumRepository';
import CryptoCompareWSInitializer from './CryptoCompareWSInitializer';
import PolygonIOPriceInitializer from './PolygonIOPriceInitializer';

@injectable()
export class FeedDataCollector {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  @inject(FeedRepository) feedRepository!: FeedRepository;
  @inject(FeedDataProcessor) feedDataProcessor!: FeedDataProcessor;
  @inject(PriceService) priceService!: PriceService;
  @inject(DatumRepository) datumRepository!: DatumRepository;
  @inject(CryptoCompareWSInitializer) cryptoCompareWSInitializer!: CryptoCompareWSInitializer;
  @inject(PolygonIOPriceInitializer) polygonIOPriceInitializer!: PolygonIOPriceInitializer;

  async apply(): Promise<void> {
    const [fcdFeeds, leafFeeds] = await Promise.all([
      this.feedRepository.getFcdFeeds(),
      this.feedRepository.getLeafFeeds(),
    ]);

    if (!Object.keys(fcdFeeds).length && !Object.keys(leafFeeds).length) {
      this.logger.error('[FeedDataCollector] FCD and L2D feeds are empty');
      return;
    }

    const feeds = this.mergeFeedsIntoUniqueHttpInputs(fcdFeeds, leafFeeds);
    const timestamp = Math.floor(Date.now() / 1000);
    const {data, prices} = await this.feedDataProcessor.apply(timestamp, feeds);

    await Promise.all([this.priceService.savePrices(prices), this.datumRepository.saveData(data)]);
  }

  private mergeFeedsIntoUniqueHttpInputs(...feeds: Feeds[]): Feeds {
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

          if (!uniqueFeeds[key].inputs.some((feed) => feed.fetcher.name === input.fetcher.name)) {
            uniqueFeeds[key].inputs.push(input);
          }
        });
      });
    });

    return uniqueFeeds;
  }

  private hasWSFetcher(input: FeedInput): boolean {
    const wsFetchers = ['CryptoComparePriceWS', 'PolygonIOCryptoPrice', 'PolygonIOStockPrice', 'PolygonIOPrice'];

    return wsFetchers.includes(input.fetcher.name);
  }
}
