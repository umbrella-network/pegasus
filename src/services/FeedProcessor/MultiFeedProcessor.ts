import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {FeedFetcher} from '../../types/Feed.js';
import {mergeArrays} from '../../utils/collections.js';
import CoingeckoMultiProcessor from './CoingeckoMultiProcessor.js';
import CryptoCompareMultiProcessor from './CryptoCompareMultiProcessor.js';
import BinanceMultiProcessor from './BinanceMultiProcessor.js';

@injectable()
export default class MultiFeedProcessor {
  @inject('Logger') logger!: Logger;
  @inject(CoingeckoMultiProcessor) coingeckoMultiProcessor!: CoingeckoMultiProcessor;
  @inject(CryptoCompareMultiProcessor) cryptoCompareMultiProcessor!: CryptoCompareMultiProcessor;
  @inject(BinanceMultiProcessor) binanceMultiProcessor!: BinanceMultiProcessor;

  async apply(feedFetchers: FeedFetcher[]): Promise<unknown[]> {
    if (!feedFetchers.length) return [];

    let response: unknown[] = [];
    response.length = feedFetchers.length;

    const promisesResults = await Promise.allSettled([
      this.cryptoCompareMultiProcessor.apply(feedFetchers),
      this.coingeckoMultiProcessor.apply(feedFetchers),
      this.binanceMultiProcessor.apply(feedFetchers),
    ]);

    promisesResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        response = mergeArrays(response, result.value);
      } else {
        const processors = ['cryptoCompareMultiProcessor', 'coingeckoMultiProcessor', 'binanceMultiProcessor'];
        this.logger.warn(`[MultiFeedProcessor] Ignored ${processors[i]}. Reason: ${result.reason}`);
      }
    });

    return response;
  }
}
