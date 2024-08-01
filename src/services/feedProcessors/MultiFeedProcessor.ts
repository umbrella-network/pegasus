import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ByBitPriceFetcher, BinancePriceFetcher, CoingeckoPriceFetcher} from '../fetchers/index.js';
import {FeedFetcherInterface, FetcherName, FetcherResult} from '../../types/fetchers.js';
import UniswapV3MultiFetcher from '../dexes/uniswapV3/UniswapV3MultiFetcher.js';
import {SovrynPriceFetcher} from '../dexes/sovryn/SovrynPriceFetcher.js';
import {FeedFetcher} from '../../types/Feed.js';

@injectable()
export default class MultiFeedProcessorNew {
  @inject(CoingeckoPriceFetcher) coingeckoPriceFetcher!: CoingeckoPriceFetcher;
  @inject(BinancePriceFetcher) binancePriceFetcher!: BinancePriceFetcher;
  @inject(ByBitPriceFetcher) byBitSpotPriceFetcher!: ByBitPriceFetcher;
  @inject(SovrynPriceFetcher) sovrynPriceFetcher!: SovrynPriceFetcher;
  @inject(UniswapV3MultiFetcher) uniswapV3PriceFetcher!: UniswapV3MultiFetcher;
  @inject('Logger') logger!: Logger;

  async apply(feedFetchers: FeedFetcher[]): Promise<unknown[]> {
    if (!feedFetchers.length) return [];

    this.logger.debug(`[MultiFeedProcessorNew] feedFetchers ${JSON.stringify(feedFetchers)}`);

    type ProcessingFeed = {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      params: any[];
      symbols: (string | undefined)[];
      indices: number[];
      fetcher: FeedFetcherInterface;
    };

    const inputMap = new Map<FetcherName, ProcessingFeed>();

    for (const [ix, fetcher] of feedFetchers.entries()) {
      const input = inputMap.get(fetcher.name);
      if (input) {
        input.params.push(fetcher.params);
        input.symbols.push(fetcher.symbol);
        input.indices.push(ix);
      } else {
        let fetcherObject;
        switch (fetcher.name) {
          case FetcherName.ByBitPrice:
            fetcherObject = this.byBitSpotPriceFetcher;
            break;
          case FetcherName.BinancePrice:
            fetcherObject = this.binancePriceFetcher;
            break;
          case FetcherName.CoingeckoPrice:
            fetcherObject = this.coingeckoPriceFetcher;
            break;
          case FetcherName.SovrynPrice:
            fetcherObject = this.sovrynPriceFetcher;
            break;
          case FetcherName.SovrynPriceOLD: // TODO: remove this backward compatible code
            fetcherObject = this.sovrynPriceFetcher;
            break;
          case FetcherName.UniswapV3:
            fetcherObject = this.uniswapV3PriceFetcher;
            break;
          case FetcherName.UniswapV3OLD: // TODO: remove this backward compatible code
            fetcherObject = this.uniswapV3PriceFetcher;
            break;
          default:
            continue;
        }

        inputMap.set(fetcher.name, {
          params: [fetcher.params],
          symbols: [fetcher.symbol],
          indices: [ix],
          fetcher: fetcherObject,
        });
      }
    }

    const promiseMap = new Map<FetcherName, {promise: () => Promise<FetcherResult>; indices: number[]}>();

    for (const [fetcherName, inputParams] of inputMap) {
      promiseMap.set(fetcherName, {
        promise: () => inputParams.fetcher.apply(inputParams.params, {symbols: inputParams.symbols}),
        indices: inputParams.indices,
      });
    }

    const promises = Array.from(promiseMap.values()).map((obj) => obj.promise());
    const allIndices = Array.from(promiseMap.values()).map((obj) => obj.indices);
    const classNames = Object.keys(promiseMap);

    const promisesResults = await Promise.allSettled(promises);

    const response: unknown[] = [];
    response.length = feedFetchers.length;

    promisesResults.forEach((result, i) => {
      const indices = allIndices[i];
      if (result.status === 'fulfilled') {
        for (const [ix, index] of indices.entries()) {
          response[index] = result.value.prices[ix];
        }
        this.logger.debug(`[MultiFeedProcessor] fulfilled ${classNames[i]}: ${JSON.stringify(result.value)}`);
      } else {
        this.logger.warn(`[MultiFeedProcessor] Ignored ${classNames[i]}. Reason: ${result.reason}`);
      }
    });

    return response;
  }
}
