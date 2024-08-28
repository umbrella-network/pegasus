import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Blockchain from '../lib/Blockchain.js';
import Settings from '../types/Settings.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {FeedFetcherInterface, FetcherName, ServiceInterface} from '../types/fetchers.js';
import {
  BinancePriceFetcher,
  ByBitPriceFetcher,
  CoingeckoPriceFetcher,
  PolygonIOCryptoSnapshotPriceFetcher,
  PolygonIOSingleCryptoPriceFetcher,
  PolygonIOStockSnapshotPriceFetcher,
} from '../services/fetchers';
import UniswapV3Fetcher from '../services/dexes/uniswapV3/UniswapV3Fetcher';
import {SovrynPriceFetcher} from '../services/dexes/sovryn/SovrynPriceFetcher';

export type PriceFetchersCollection = {
  [fetcherName: string]: ServiceInterface | undefined;
};

@injectable()
export class PriceFetcherServiceRepository {
  logger!: Logger;
  private collection: PriceFetchersCollection = {};

  constructor(
    @inject('Settings') settings: Settings,
    @inject('Logger') logger: Logger,
    @inject(BinancePriceFetcher) binancePriceFetcher: BinancePriceFetcher,
    @inject(ByBitPriceFetcher) byBitSpotPriceFetcher: ByBitPriceFetcher,
    @inject(CoingeckoPriceFetcher) coingeckoPriceFetcher: CoingeckoPriceFetcher,

    @inject(PolygonIOCryptoSnapshotPriceFetcher)
    polygonIOCryptoSnapshotPriceFetcher: PolygonIOCryptoSnapshotPriceFetcher,
    @inject(PolygonIOSingleCryptoPriceFetcher)
    polygonIOSingleCryptoPriceFetcher: PolygonIOSingleCryptoPriceFetcher,
    @inject(PolygonIOStockSnapshotPriceFetcher) polygonIOStockSnapshotPriceFetcher: PolygonIOStockSnapshotPriceFetcher,

    @inject(UniswapV3Fetcher) uniswapV3PriceFetcher: UniswapV3Fetcher,
    @inject(SovrynPriceFetcher) sovrynPriceFetcher: SovrynPriceFetcher,
  ) {
    this.logger = logger;

    // this.collection[FetcherName.BinancePrice] = binancePriceFetcher;
    // this.collection[FetcherName.ByBitPrice] = byBitSpotPriceFetcher;
    //
    // this.collection[FetcherName.CoingeckoPrice] = coingeckoPriceFetcher;
    //
    // this.collection[FetcherName.PolygonIOCryptoSnapshotPrice] = polygonIOCryptoSnapshotPriceFetcher;
    // // TODO: remove this backward compatible code
    // this.collection[FetcherName.PolygonIOCryptoPriceOLD] = polygonIOCryptoSnapshotPriceFetcher;
    //
    // this.collection[FetcherName.PolygonIOStockSnapshotPrice] = polygonIOStockSnapshotPriceFetcher;
    // this.collection[FetcherName.PolygonIOSingleCryptoPrice] = polygonIOSingleCryptoPriceFetcher;
    //
    // this.collection[FetcherName.SovrynPrice] = sovrynPriceFetcher;
    // // TODO: remove this backward compatible code
    // this.collection[FetcherName.SovrynPriceOLD] = sovrynPriceFetcher;
    //
    // this.collection[FetcherName.UniswapV3] = uniswapV3PriceFetcher;
    // // TODO: remove this backward compatible code
    // this.collection[FetcherName.UniswapV3OLD] = uniswapV3PriceFetcher;
  }

  get(feedName: string): ServiceInterface | undefined {
    if (this.collection[feedName] === undefined) {
      this.logger.error(`[PriceFetchersRepository] fetcher ${feedName} does not exists`);
    }

    return this.collection[feedName];
  }
}
