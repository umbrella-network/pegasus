import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {
  ByBitPriceFetcher,
  BinancePriceFetcher,
  CoingeckoPriceFetcher,
  PolygonIOCryptoSnapshotPriceFetcher,
  PolygonIOSingleCryptoPriceFetcher,
} from '../fetchers/index.js';
import {
  allMultiFetchers,
  FeedFetcherInputParams,
  FeedFetcherInterface,
  FetcherName,
  FetcherResult,
  StringOrUndefined,
} from '../../types/fetchers.js';
import UniswapV3Fetcher from '../dexes/uniswapV3/UniswapV3Fetcher.js';
import {SovrynPriceFetcher} from '../dexes/sovryn/SovrynPriceFetcher.js';
import {FeedFetcher} from '../../types/Feed.js';

@injectable()
export default class MultiFeedProcessor {
  @inject(BinancePriceFetcher) binancePriceFetcher!: BinancePriceFetcher;
  @inject(ByBitPriceFetcher) byBitSpotPriceFetcher!: ByBitPriceFetcher;
  @inject(CoingeckoPriceFetcher) coingeckoPriceFetcher!: CoingeckoPriceFetcher;
  @inject(PolygonIOCryptoSnapshotPriceFetcher)
  polygonIOCryptoSnapshotPriceFetcher!: PolygonIOCryptoSnapshotPriceFetcher;
  @inject(PolygonIOSingleCryptoPriceFetcher)
  polygonIOSingleCryptoPriceFetcher!: PolygonIOSingleCryptoPriceFetcher;
  @inject(UniswapV3Fetcher) uniswapV3PriceFetcher!: UniswapV3Fetcher;
  @inject(SovrynPriceFetcher) sovrynPriceFetcher!: SovrynPriceFetcher;

  @inject('Logger') logger!: Logger;

  private logPrefix = '[MultiFeedProcessor]';

  async apply(feedFetchers: FeedFetcher[]): Promise<unknown[]> {
    if (!feedFetchers.length) return [];

    this.logger.debug(`${this.logPrefix} feedFetchers ${JSON.stringify(feedFetchers)}`);

    type ProcessingFeed = {
      params: FeedFetcherInputParams[];
      symbols: StringOrUndefined[];
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
          case FetcherName.BinancePrice:
            fetcherObject = this.binancePriceFetcher;
            break;
          case FetcherName.ByBitPrice:
            fetcherObject = this.byBitSpotPriceFetcher;
            break;
          case FetcherName.CoingeckoPrice:
            fetcherObject = this.coingeckoPriceFetcher;
            break;
          case FetcherName.PolygonIOCryptoSnapshotPrice:
          case FetcherName.PolygonIOCryptoPriceOLD: // TODO: remove this backward compatible code
            fetcherObject = this.polygonIOCryptoSnapshotPriceFetcher;
            break;
          case FetcherName.PolygonIOSingleCryptoPrice:
            fetcherObject = this.polygonIOSingleCryptoPriceFetcher;
            break;
          case FetcherName.SovrynPrice:
          case FetcherName.SovrynPriceOLD: // TODO: remove this backward compatible code
            fetcherObject = this.sovrynPriceFetcher;
            break;
          case FetcherName.UniswapV3:
          case FetcherName.UniswapV3OLD: // TODO: remove this backward compatible code
            fetcherObject = this.uniswapV3PriceFetcher;
            break;
          default:
            if (allMultiFetchers.has(fetcher.name)) {
              throw new Error(`allMultiFetchers missconfiguration for ${fetcher.name}`);
            }
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

    this.logger.debug(`${this.logPrefix} inputMap: ${JSON.stringify(inputMap)}`);

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
        this.logger.debug(`${this.logPrefix} fulfilled ${classNames[i]}: ${JSON.stringify(result.value)}`);
      } else {
        this.logger.warn(`${this.logPrefix} Ignored ${classNames[i]}. Reason: ${result.reason}`);
      }
    });

    return response;
  }
}
