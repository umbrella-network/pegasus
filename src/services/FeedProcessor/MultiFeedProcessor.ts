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

    const promiseMap = {
      CryptoCompareMultiProcessor: () => this.cryptoCompareMultiProcessor.apply(feedFetchers),
      CoingeckoMultiProcessor: () => this.coingeckoMultiProcessor.apply(feedFetchers),
      UniswapV3MultiProcessor: () => this.uniswapV3MultiProcessor.apply(feedFetchers),
      SovrynMultiProcessor: () => this.sovrynMultiProcessor.apply(feedFetchers),
    };

    const promises = Object.values(promiseMap).map((fn) => fn());
    const classNames = Object.keys(promiseMap);

    const promisesResults = await Promise.allSettled(promises);

    promisesResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        response = mergeArrays(response, result.value);
      } else {
        this.logger.warn(`[MultiFeedProcessor] Ignored ${classNames[i]}. Reason: ${result.reason}`);
      }
    });

    return response;
  }
}
