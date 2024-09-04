import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../types/Settings.js';
import {FetcherName, ServiceInterface} from '../types/fetchers.js';
import {BinancePriceService} from '../workers/fetchers/BinancePriceService.js';
import {ByBitPriceService} from '../workers/fetchers/ByBitPriceService.js';
import {PolygonIOCryptoSnapshotPriceService} from '../workers/fetchers/PolygonIOCryptoSnapshotPriceService.js';
import {PolygonIOStockSnapshotPriceService} from '../workers/fetchers/PolygonIOStockSnapshotPriceService.js';
import {CoingeckoPriceService} from '../workers/fetchers/CoingeckoPriceService.js';
import {GoldApiPriceService} from '../workers/fetchers/GoldApiPriceService.js';
import {MetalPriceApiService} from '../workers/fetchers/MetalPriceApiService.js';
import {MetalsDevApiService} from '../workers/fetchers/MetalsDevApiService.js';
import {PolygonIOCurrencySnapshotGramsService} from '../workers/fetchers/PolygonIOCurrencySnapshotGramsService.js';
import {PolygonIOSingleCryptoPriceService} from '../workers/fetchers/PolygonIOSingleCryptoPriceService.js';
import {UniswapV3Service} from '../workers/fetchers/dexes/uniswapV3/UniswapV3Service.js';
import {SovrynPriceService} from '../workers/fetchers/dexes/sovryn/SovrynPriceService.js';

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
    @inject(CoingeckoPriceService) coingeckoPriceService: CoingeckoPriceService,
    @inject(GoldApiPriceService) goldApiPriceService: GoldApiPriceService,
    @inject(MetalPriceApiService) metalPriceApiService: MetalPriceApiService,
    @inject(MetalsDevApiService) metalsDevApiService: MetalsDevApiService,
    @inject(PolygonIOCryptoSnapshotPriceService)
    polygonIOCryptoSnapshotPrice: PolygonIOCryptoSnapshotPriceService,
    @inject(PolygonIOSingleCryptoPriceService)
    polygonIOSingleCryptoPriceService: PolygonIOSingleCryptoPriceService,
    @inject(PolygonIOCurrencySnapshotGramsService)
    polygonIOCurrencySnapshotGramsService: PolygonIOCurrencySnapshotGramsService,
    @inject(PolygonIOStockSnapshotPriceService) polygonIOStockSnapshotPrice: PolygonIOStockSnapshotPriceService,

    @inject(UniswapV3Service) uniswapV3Service: UniswapV3Service,
    @inject(SovrynPriceService) sovrynPriceService: SovrynPriceService,
  ) {
    this.logger = logger;

    this.collection[FetcherName.BinancePrice] = binancePriceService;
    this.collection[FetcherName.ByBitPrice] = byBitPriceService;
    this.collection[FetcherName.CoingeckoPrice] = coingeckoPriceService;
    this.collection[FetcherName.GoldApiPrice] = goldApiPriceService;
    this.collection[FetcherName.MetalPriceApi] = metalPriceApiService;
    this.collection[FetcherName.MetalsDevApi] = metalsDevApiService;
    this.collection[FetcherName.PolygonIOCryptoSnapshotPrice] = polygonIOCryptoSnapshotPrice;
    this.collection[FetcherName.PolygonIOCurrencySnapshotGrams] = polygonIOCurrencySnapshotGramsService;
    this.collection[FetcherName.PolygonIOSingleCryptoPrice] = polygonIOSingleCryptoPriceService;
    this.collection[FetcherName.PolygonIOStockSnapshotPrice] = polygonIOStockSnapshotPrice;
    this.collection[FetcherName.SovrynPrice] = sovrynPriceService;
    this.collection[FetcherName.UniswapV3] = uniswapV3Service;
  }

  get(feedName: string): ServiceInterface | undefined {
    if (this.collection[feedName] === undefined) {
      this.logger.error(`[PriceFetchersRepository] fetcher ${feedName} does not exists`);
    }

    return this.collection[feedName];
  }
}
