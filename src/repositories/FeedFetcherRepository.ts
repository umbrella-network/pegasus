import {inject, injectable} from 'inversify';

import * as fetchers from '../services/fetchers/index.js';
import {FeedFetcherInterface} from '../types/fetchers.js';

@injectable()
export class FeedFetcherRepository {
  readonly collection: {[key: string]: FeedFetcherInterface};

  constructor(
    @inject(fetchers.PolygonIOStockPriceFetcher) PolygonIOStockPrice: fetchers.PolygonIOStockPriceFetcher,
    @inject(fetchers.PolygonIOCryptoPriceFetcher) PolygonIOCryptoPrice: fetchers.PolygonIOCryptoPriceFetcher,
    @inject(fetchers.PolygonIOCurrencySnapshotGramsFetcher)
    PolygonIOCurrencySnapshotGrams: fetchers.PolygonIOCurrencySnapshotGramsFetcher,
    @inject(fetchers.UniswapPriceFetcher) UniswapPriceFetcher: fetchers.UniswapPriceFetcher,
    @inject(fetchers.EvmTWAPGasPriceFetcher) evmTWAPGasPriceFetcher: fetchers.EvmTWAPGasPriceFetcher,
    @inject(fetchers.GoldApiPriceFetcher) GoldApiPrice: fetchers.GoldApiPriceFetcher,
    @inject(fetchers.MetalPriceApiFetcher) MetalPriceApi: fetchers.MetalPriceApiFetcher,
    @inject(fetchers.MetalsDevApiPriceFetcher) MetalsDevApi: fetchers.MetalsDevApiPriceFetcher,
  ) {
    this.collection = {
      PolygonIOStockPrice,
      PolygonIOCryptoPrice,
      PolygonIOCurrencySnapshotGrams,
      UniswapPriceFetcher,
      TWAPGasPrice: evmTWAPGasPriceFetcher,
      GoldApiPrice,
      MetalPriceApi,
      MetalsDevApi,
    };
  }

  find(id: string): FeedFetcherInterface | undefined {
    return this.collection[id];
  }

  all(): FeedFetcherInterface[] {
    return Object.values(this.collection);
  }
}
