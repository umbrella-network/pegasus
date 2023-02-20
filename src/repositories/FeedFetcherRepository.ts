import {inject, injectable} from 'inversify';
import * as fetchers from '../services/fetchers';

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
    @inject(fetchers.OnChainDataFetcher) OnChainData: fetchers.OnChainDataFetcher,
    @inject(fetchers.YearnVaultTokenPriceFetcher) YearnVaultTokenPrice: fetchers.YearnVaultTokenPriceFetcher,
    @inject(fetchers.OptionsPriceFetcher) OptionsPrice: fetchers.OptionsPriceFetcher,
    @inject(fetchers.UniswapPriceFetcher) UniswapPriceFetcher: fetchers.UniswapPriceFetcher,
    @inject(fetchers.RandomNumberFetcher) RandomNumber: fetchers.RandomNumberFetcher,
  ) {
    this.collection = {
      CryptoCompareHistoHour,
      CryptoCompareHistoDay,
      OnChainData,
      YearnVaultTokenPrice,
      OptionsPrice,
      UniswapPriceFetcher,
      RandomNumber,
    };
  }

  find(id: string): FeedFetcher | undefined {
    return this.collection[id];
  }

  all(): FeedFetcher[] {
    return Object.values(this.collection);
  }
}
