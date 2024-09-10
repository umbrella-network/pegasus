import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../types/Settings.js';
import {FetcherName, ServiceInterface} from '../types/fetchers.js';
import {BinancePriceFetcher} from '../workers/fetchers/BinancePriceFetcher.js';
import {ByBitPriceFetcher} from '../workers/fetchers/ByBitPriceFetcher.js';
import {PolygonIOCryptoSnapshotPriceFetcher} from '../workers/fetchers/PolygonIOCryptoSnapshotPriceFetcher.js';
import {PolygonIOStockSnapshotPriceFetcher} from '../workers/fetchers/PolygonIOStockSnapshotPriceFetcher.js';
import {CoingeckoPriceFetcher} from '../workers/fetchers/CoingeckoPriceFetcher.js';
import {GoldApiPriceFetcher} from '../workers/fetchers/GoldApiPriceFetcher.js';
import {MetalPriceApiFetcher} from '../workers/fetchers/MetalPriceApiFetcher.js';
import {MetalsDevApiFetcher} from '../workers/fetchers/MetalsDevApiFetcher.js';
import {PolygonIOCurrencySnapshotGramsFetcher} from '../workers/fetchers/PolygonIOCurrencySnapshotGramsFetcher.js';
import {PolygonIOSingleCryptoPriceFetcher} from '../workers/fetchers/PolygonIOSingleCryptoPriceFetcher.js';
import {UniswapV3Fetcher} from '../workers/fetchers/dexes/uniswapV3/UniswapV3Fetcher.js';
import {SovrynPriceFetcher} from '../workers/fetchers/dexes/sovryn/SovrynPriceFetcher.js';

export type PriceFetchersCollection = {
  [fetcherName: string]: ServiceInterface | undefined;
};

@injectable()
export class PriceFetcherRepository {
  private logger!: Logger;
  private collection: PriceFetchersCollection = {};

  constructor(
    @inject('Settings') settings: Settings,
    @inject('Logger') logger: Logger,

    @inject(BinancePriceFetcher) binancePriceService: BinancePriceFetcher,
    @inject(ByBitPriceFetcher) byBitPriceService: ByBitPriceFetcher,
    @inject(CoingeckoPriceFetcher) coingeckoPriceService: CoingeckoPriceFetcher,
    @inject(GoldApiPriceFetcher) goldApiPriceService: GoldApiPriceFetcher,
    @inject(MetalPriceApiFetcher) metalPriceApiService: MetalPriceApiFetcher,
    @inject(MetalsDevApiFetcher) metalsDevApiService: MetalsDevApiFetcher,
    @inject(PolygonIOCryptoSnapshotPriceFetcher)
    polygonIOCryptoSnapshotPrice: PolygonIOCryptoSnapshotPriceFetcher,
    @inject(PolygonIOSingleCryptoPriceFetcher)
    polygonIOSingleCryptoPriceService: PolygonIOSingleCryptoPriceFetcher,
    @inject(PolygonIOCurrencySnapshotGramsFetcher)
    polygonIOCurrencySnapshotGramsService: PolygonIOCurrencySnapshotGramsFetcher,
    @inject(PolygonIOStockSnapshotPriceFetcher) polygonIOStockSnapshotPrice: PolygonIOStockSnapshotPriceFetcher,

    @inject(UniswapV3Fetcher) uniswapV3Service: UniswapV3Fetcher,
    @inject(SovrynPriceFetcher) sovrynPriceService: SovrynPriceFetcher,
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
