import {inject, injectable} from 'inversify';

import * as fetchers from '../services/fetchers/index.js';
import {FeedFetcherInterface} from '../types/fetchers.js';

@injectable()
export class FeedFetcherRepository {
  readonly collection: {[key: string]: FeedFetcherInterface};

  constructor(
    @inject(fetchers.BinancePriceGetter) BinancePrice: fetchers.BinancePriceGetter,
    @inject(fetchers.ByBitPriceGetter) ByBitPrice: fetchers.ByBitPriceGetter,
    @inject(fetchers.CoingeckoPriceGetter) CoingeckoPrice: fetchers.CoingeckoPriceGetter,
    @inject(fetchers.EvmTWAPGasPriceGetter) evmTWAPGasPriceFetcher: fetchers.EvmTWAPGasPriceGetter,
    @inject(fetchers.GoldApiPriceGetter) GoldApiPrice: fetchers.GoldApiPriceGetter,
    @inject(fetchers.MetalPriceApiGetter) MetalPriceApi: fetchers.MetalPriceApiGetter,
    @inject(fetchers.MetalsDevApiGetter) MetalsDevApi: fetchers.MetalsDevApiGetter,

    @inject(fetchers.PolygonIOCryptoSnapshotPriceGetter)
    PolygonIOCryptoSnapshotPrice: fetchers.PolygonIOCryptoSnapshotPriceGetter,
    @inject(fetchers.PolygonIOSingleCryptoPriceGetter)
    PolygonIOSingleCryptoPrice: fetchers.PolygonIOSingleCryptoPriceGetter,
    @inject(fetchers.PolygonIOCurrencySnapshotGramsGetter)
    PolygonIOCurrencySnapshotGrams: fetchers.PolygonIOCurrencySnapshotGramsGetter,
    @inject(fetchers.PolygonIOStockSnapshotPriceGetter)
    PolygonIOStockSnapshotPrice: fetchers.PolygonIOStockSnapshotPriceGetter,

    @inject(fetchers.SovrynPriceGetter) SovrynPrice: fetchers.SovrynPriceGetter,
    @inject(fetchers.UniswapV3Getter) UniswapV3: fetchers.UniswapV3Getter,
  ) {
    this.collection = {
      BinancePrice,
      ByBitPrice,
      CoingeckoPrice,
      TWAPGasPrice: evmTWAPGasPriceFetcher,
      GoldApiPrice,
      MetalPriceApi,
      MetalsDevApi,
      PolygonIOCryptoSnapshotPrice,
      PolygonIOCurrencySnapshotGrams,
      PolygonIOSingleCryptoPrice,
      PolygonIOStockSnapshotPrice,
      SovrynPrice,
      UniswapV3,
    };
  }

  find(id: string): FeedFetcherInterface | undefined {
    return this.collection[id];
  }

  all(): FeedFetcherInterface[] {
    return Object.values(this.collection);
  }
}
