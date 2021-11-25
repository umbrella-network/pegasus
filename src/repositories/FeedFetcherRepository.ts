import {inject, injectable} from 'inversify';
import * as fetchers from '../services/fetchers';

interface FeedFetcher {
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
    @inject(fetchers.GVolImpliedVolatilityFetcher) GVolImpliedVolatility: fetchers.GVolImpliedVolatilityFetcher,
    @inject(fetchers.PolygonIOStockPriceFetcher) PolygonIOStockPrice: fetchers.PolygonIOStockPriceFetcher,
    @inject(fetchers.PolygonIOStockPriceFetcher) PolygonIOPrice: fetchers.PolygonIOStockPriceFetcher,
    @inject(fetchers.PolygonIOCryptoPriceFetcher) PolygonIOCryptoPrice: fetchers.PolygonIOCryptoPriceFetcher,
    @inject(fetchers.CryptoComparePriceWSFetcher) CryptoComparePriceWS: fetchers.CryptoComparePriceWSFetcher,
    @inject(fetchers.IEXEnergyFetcher) IEXEnergy: fetchers.IEXEnergyFetcher,
    @inject(fetchers.CoingeckoPriceFetcher) CoingeckoPrice: fetchers.CoingeckoPriceFetcher,
    @inject(fetchers.CoinmarketcapPriceFetcher) CoinmarketcapPrice: fetchers.CoinmarketcapPriceFetcher,
    @inject(fetchers.CoinmarketcapHistoHourFetcher)
    CoinmarketcapHistoHour: fetchers.CoinmarketcapHistoHourFetcher,
    @inject(fetchers.CoinmarketcapHistoDayFetcher) CoinmarketcapHistoDay: fetchers.CoinmarketcapHistoDayFetcher,
    @inject(fetchers.BEACPIAverageFetcher) BEACPIAverage: fetchers.BEACPIAverageFetcher,
    @inject(fetchers.OnChainDataFetcher) OnChainData: fetchers.OnChainDataFetcher,
    @inject(fetchers.KaikoPriceStreamFetcher) KaikoPriceStream: fetchers.KaikoPriceStreamFetcher,
    @inject(fetchers.YearnVaultTokenPriceFetcher) YearnVaultTokenPrice: fetchers.YearnVaultTokenPriceFetcher,
    @inject(fetchers.OptionsPriceFetcher) OptionsPrice: fetchers.OptionsPriceFetcher,
    @inject(fetchers.UniswapPriceFetcher) UniswapPriceFetcher: fetchers.UniswapPriceFetcher,
  ) {
    this.collection = {
      CryptoCompareHistoHour,
      CryptoCompareHistoDay,
      GVolImpliedVolatility,
      PolygonIOStockPrice,
      PolygonIOPrice,
      PolygonIOCryptoPrice,
      CryptoComparePriceWS,
      IEXEnergy,
      CoingeckoPrice,
      CoinmarketcapPrice,
      CoinmarketcapHistoHour,
      CoinmarketcapHistoDay,
      BEACPIAverage,
      OnChainData,
      KaikoPriceStream,
      YearnVaultTokenPrice,
      OptionsPrice,
      UniswapPriceFetcher,
    };
  }

  find(id: string): FeedFetcher | undefined {
    return this.collection[id];
  }

  all(): FeedFetcher[] {
    return Object.values(this.collection);
  }
}
