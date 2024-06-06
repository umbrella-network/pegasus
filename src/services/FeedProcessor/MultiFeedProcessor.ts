import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {FeedFetcher} from '../../types/Feed.js';
import {mergeArrays} from '../../utils/collections.js';
import CoingeckoMultiProcessor from './CoingeckoMultiProcessor.js';
import CryptoCompareMultiProcessor from './CryptoCompareMultiProcessor.js';
import UniswapV3MultiProcessor from './UniswapV3MultiProcessor.js';
import SovrynMultiProcessor from '../dexes/sovryn/SovrynMultiProcessor.js';

@injectable()
export default class MultiFeedProcessor {
  @inject('Logger') logger!: Logger;
  @inject(CoingeckoMultiProcessor) coingeckoMultiProcessor!: CoingeckoMultiProcessor;
  @inject(CryptoCompareMultiProcessor) cryptoCompareMultiProcessor!: CryptoCompareMultiProcessor;
  @inject(UniswapV3MultiProcessor) uniswapV3MultiProcessor!: UniswapV3MultiProcessor;
  @inject(SovrynMultiProcessor) sovrynMultiProcessor!: SovrynMultiProcessor;

  async apply(feedFetchers: FeedFetcher[]): Promise<unknown[]> {
    if (!feedFetchers.length) return [];

    let response: unknown[] = [];
    response.length = feedFetchers.length;

    const promiseObjects = [
      {
        promise: this.cryptoCompareMultiProcessor.apply(feedFetchers),
        className: this.cryptoCompareMultiProcessor.constructor.name,
      },
      {
        promise: this.coingeckoMultiProcessor.apply(feedFetchers),
        className: this.coingeckoMultiProcessor.constructor.name,
      },
      {
        promise: this.uniswapV3MultiProcessor.apply(feedFetchers),
        className: this.uniswapV3MultiProcessor.constructor.name,
      },
      {promise: this.sovrynMultiProcessor.apply(feedFetchers), className: this.sovrynMultiProcessor.constructor.name},
    ];

    const promisesResults = await Promise.allSettled(promiseObjects.map((obj) => obj.promise));

    promisesResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        response = mergeArrays(response, result.value);
      } else {
        this.logger.warn(`[MultiFeedProcessor] Ignored ${promiseObjects[i].className}. Reason: ${result.reason}`);
      }
    });

    return response;
  }
}
