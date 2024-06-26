import {inject, injectable} from 'inversify';
import * as fetchers from '../services/fetchers/index.js';
import {FeedFetcherInterface} from '../types/fetchers.js';

@injectable()
export class FeedFetcherRepository {
  readonly collection: {[key: string]: FeedFetcherInterface};

  constructor(
    @inject(fetchers.CryptoCompareHistoHourFetcher) CryptoCompareHistoHour: fetchers.CryptoCompareHistoHourFetcher,
    @inject(fetchers.CryptoCompareHistoDayFetcher) CryptoCompareHistoDay: fetchers.CryptoCompareHistoDayFetcher,
    @inject(fetchers.PolygonIOStockPriceFetcher) PolygonIOStockPrice: fetchers.PolygonIOStockPriceFetcher,
    @inject(fetchers.PolygonIOCryptoPriceFetcher) PolygonIOCryptoPrice: fetchers.PolygonIOCryptoPriceFetcher,
    @inject(fetchers.PolygonIOCurrencySnapshotGramsFetcher)
    PolygonIOCurrencySnapshotGrams: fetchers.PolygonIOCurrencySnapshotGramsFetcher,
    @inject(fetchers.CryptoComparePriceWSFetcher) CryptoComparePriceWS: fetchers.CryptoComparePriceWSFetcher,
    @inject(fetchers.OnChainDataFetcher) OnChainData: fetchers.OnChainDataFetcher,
    @inject(fetchers.YearnVaultTokenPriceFetcher) YearnVaultTokenPrice: fetchers.YearnVaultTokenPriceFetcher,
    @inject(fetchers.OptionsPriceFetcher) OptionsPrice: fetchers.OptionsPriceFetcher,
    @inject(fetchers.UniswapPriceFetcher) UniswapPriceFetcher: fetchers.UniswapPriceFetcher,
    @inject(fetchers.RandomNumberFetcher) RandomNumber: fetchers.RandomNumberFetcher,
    @inject(fetchers.EvmTWAPGasPriceFetcher) evmTWAPGasPriceFetcher: fetchers.EvmTWAPGasPriceFetcher,
    @inject(fetchers.GoldApiPriceFetcher) GoldApiPrice: fetchers.GoldApiPriceFetcher,
    @inject(fetchers.MetalPriceApiFetcher) MetalPriceApi: fetchers.MetalPriceApiFetcher,
    @inject(fetchers.MetalsDevApiPriceFetcher) MetalsDevApi: fetchers.MetalsDevApiPriceFetcher,
  ) {
    this.collection = {
      CryptoCompareHistoHour,
      CryptoCompareHistoDay,
      PolygonIOStockPrice,
      PolygonIOCryptoPrice,
      PolygonIOCurrencySnapshotGrams,
      CryptoComparePriceWS,
      OnChainData,
      YearnVaultTokenPrice,
      OptionsPrice,
      UniswapPriceFetcher,
      RandomNumber,
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
