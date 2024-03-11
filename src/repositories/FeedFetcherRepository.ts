import {inject, injectable} from 'inversify';
import * as fetchers from '../services/fetchers/index.js';
import PolygonIOCurrencySnapshotFetcher from "../services/fetchers/PolygonIOCurrencySnapshotFetcher";

export interface FeedFetcher {
  // eslint-disable-next-line
  apply: (params: any, timestamp: number) => Promise<any>;
}

@injectable()
export class FeedFetcherRepository {
  readonly collection: {[key: string]: FeedFetcher};

  constructor(
    @inject(fetchers.CryptoCompareHistoHourFetcher)
    CryptoCompareHistoHour: fetchers.CryptoCompareHistoHourFetcher,
    @inject(fetchers.CryptoCompareHistoDayFetcher) CryptoCompareHistoDay: fetchers.CryptoCompareHistoDayFetcher,
    @inject(fetchers.PolygonIOStockPriceFetcher) PolygonIOStockPrice: fetchers.PolygonIOStockPriceFetcher,
    @inject(fetchers.PolygonIOStockPriceFetcher) PolygonIOPrice: fetchers.PolygonIOStockPriceFetcher,
    @inject(fetchers.PolygonIOCryptoPriceFetcher) PolygonIOCryptoPrice: fetchers.PolygonIOCryptoPriceFetcher,
    @inject(fetchers.PolygonIOCurrencySnapshotFetcher) PolygonIOCurrencySnapshot: fetchers.PolygonIOCurrencySnapshotFetcher,
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
      PolygonIOPrice,
      PolygonIOCryptoPrice,
      PolygonIOCurrencySnapshot,
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

  find(id: string): FeedFetcher | undefined {
    return this.collection[id];
  }

  all(): FeedFetcher[] {
    return Object.values(this.collection);
  }
}
