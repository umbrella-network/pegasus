import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {
  ByBitPriceFetcher,
  BinancePriceFetcher,
  CoingeckoPriceFetcher,
  PolygonIOCryptoSnapshotPriceFetcher,
  PolygonIOSingleCryptoPriceFetcher,
  PolygonIOStockSnapshotPriceFetcher,
} from '../fetchers/index.js';
import {
  allMultiFetchers,
  FeedFetcherInputParams,
  FeedFetcherInterface,
  FetcherName,
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
  @inject(PolygonIOStockSnapshotPriceFetcher) polygonIOStockSnapshotPriceFetcher!: PolygonIOStockSnapshotPriceFetcher;
  @inject(UniswapV3Fetcher) uniswapV3PriceFetcher!: UniswapV3Fetcher;
  @inject(SovrynPriceFetcher) sovrynPriceFetcher!: SovrynPriceFetcher;

  @inject('Logger') logger!: Logger;

  private logPrefix = '[MultiFeedProcessor]';

  async apply(feedFetchers: FeedFetcher[], timestamp: number): Promise<unknown[]> {
    if (!feedFetchers.length) return [];

    this.logger.debug(`${this.logPrefix} feedFetchers ${feedFetchers.map((f) => `${f.name}: ${f.symbol}`)}`);

    type ProcessingFeed = {
      params: FeedFetcherInputParams[];
      symbols: StringOrUndefined[];
      indices: number[];
      fetcher: FeedFetcherInterface;
      fetcherName: FetcherName;
    };

    const inputMap: Record<string, ProcessingFeed> = {};

    for (const [ix, fetcher] of feedFetchers.entries()) {
      const input = inputMap[fetcher.name];

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
          case FetcherName.PolygonIOStockSnapshotPrice:
            fetcherObject = this.polygonIOStockSnapshotPriceFetcher;
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
              throw new Error(`allMultiFetchers misconfiguration for ${fetcher.name}`);
            }

            continue;
        }

        inputMap[fetcher.name] = {
          params: [fetcher.params],
          symbols: [fetcher.symbol],
          indices: [ix],
          fetcher: fetcherObject,
          fetcherName: fetcher.name,
        };
      }
    }

    const response: unknown[] = new Array(feedFetchers.length).fill(undefined);
    const mapInputs = Object.values(inputMap);

    const fetchedFeeds = await Promise.allSettled(
      mapInputs.map((data: ProcessingFeed) => data.fetcher.apply(data.params, {symbols: data.symbols, timestamp})),
    );

    fetchedFeeds.forEach((results, ix) => {
      if (results.status == 'rejected') {
        this.logger.error(`${this.logPrefix} ${mapInputs[ix].fetcherName} rejected: ${results.reason}`);
        return;
      }

      const fetchedResults = results.value;
      const indieces = mapInputs[ix].indices;
      const fetcherName = mapInputs[ix].fetcherName;

      this.logger.debug(`${this.logPrefix} [${fetcherName}] fetchedResults.prices: ${fetchedResults.prices}`);
      this.logger.debug(`${this.logPrefix} [${fetcherName}] symbols: ${mapInputs[ix].symbols}`);

      fetchedResults.prices.forEach((price, i) => {
        if (price) {
          response[indieces[i]] = price;
          this.logger.debug(`${this.logPrefix} response[${indieces[i]}] = ${price}`);
        }
      });
    });

    this.logger.debug(`${this.logPrefix} response: ${response}`);

    return response;
  }
}
