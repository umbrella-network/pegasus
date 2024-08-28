import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../types/Settings.js';
import {FetcherName, ServiceInterface} from '../types/fetchers.js';
import {BinancePriceService} from '../workers/fetchers/BinancePriceService.js';
import {ByBitPriceService} from '../workers/fetchers/ByBitPriceService.js';
import {PolygonIOCryptoSnapshotPriceService} from '../workers/fetchers/PolygonIOCryptoSnapshotPriceService.js';
import {PolygonIOStockSnapshotPriceService} from '../workers/fetchers/PolygonIOStockSnapshotPriceService.js';

export type PriceFetchersCollection = {
  [fetcherName: string]: ServiceInterface | undefined;
};

@injectable()
export class PriceFetcherServiceRepository {
  private logger!: Logger;
  private collection: PriceFetchersCollection = {};

  constructor(
    @inject('Settings') settings: Settings,
    @inject('Logger') logger: Logger,
    @inject(BinancePriceService) binancePriceService: BinancePriceService,
    @inject(ByBitPriceService) byBitPriceService: ByBitPriceService,
    // @inject(CoingeckoPriceFetcher) coingeckoPriceFetcher: CoingeckoPriceFetcher,
    //
    @inject(PolygonIOCryptoSnapshotPriceService)
    polygonIOCryptoSnapshotPrice: PolygonIOCryptoSnapshotPriceService,
    // @inject(PolygonIOSingleCryptoPriceFetcher)
    // polygonIOSingleCryptoPriceFetcher: PolygonIOSingleCryptoPriceFetcher,
    @inject(PolygonIOStockSnapshotPriceService) polygonIOStockSnapshotPrice: PolygonIOStockSnapshotPriceService,
    //
    // @inject(UniswapV3Fetcher) uniswapV3PriceFetcher: UniswapV3Fetcher,
    // @inject(SovrynPriceFetcher) sovrynPriceFetcher: SovrynPriceFetcher,
  ) {
    this.logger = logger;

    this.collection[FetcherName.BinancePrice] = binancePriceService;
    this.collection[FetcherName.ByBitPrice] = byBitPriceService;
    //
    // this.collection[FetcherName.CoingeckoPrice] = coingeckoPriceFetcher;
    //
    this.collection[FetcherName.PolygonIOCryptoSnapshotPrice] = polygonIOCryptoSnapshotPrice;
    // TODO: remove this backward compatible code
    this.collection[FetcherName.PolygonIOCryptoPriceOLD] = polygonIOCryptoSnapshotPrice;

    this.collection[FetcherName.PolygonIOStockSnapshotPrice] = polygonIOStockSnapshotPrice;
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
