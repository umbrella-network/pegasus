import {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';

import {KuCoinDataRepository} from '../../repositories/fetchers/KuCoinDataRepository.js';
import {SymbolParsedResponse, SymbolPriceFetcher} from './_common/SymbolPriceFetcher.js';
import {FetcherName} from '../../types/fetchers.js';

type KuCoinResponse = {
  time: number;
  ticker: [
    {
      symbol: string; // symbol
      symbolName: string; // Name of trading pairs, it would change after renaming
      buy: string; // bestAsk
      sell: string; // bestBid
      bestBidSize: string;
      bestAskSize: string;
      changeRate: string; // 24h change rate
      changePrice: string; // 24h change price
      high: string; // 24h highest price
      low: string; // 24h lowest price
      vol: string; // 24h volume，the aggregated trading volume in BTC
      volValue: string; // 24h total, the trading volume in quote currency of last 24 hours
      last: string; // last price
      averagePrice: string; // 24h average transaction price yesterday
      takerFeeRate: string; // Basic Taker Fee
      makerFeeRate: string; // Basic Maker Fee
      takerCoefficient: string; // Taker Fee Coefficient
      makerCoefficient: string; // Maker Fee Coefficient
    },
  ];
};

@injectable()
export class KuCoinPriceFetcher extends SymbolPriceFetcher {
  constructor(
    @inject('Settings') settings: Settings,
    @inject(KuCoinDataRepository) dataRepository: KuCoinDataRepository,
  ) {
    super();

    this.timeout = settings.api.binance.timeout;
    this.dataRepository = dataRepository;
    this.logPrefix = '[KuCoinPriceFetcher]';
    this.sourceUrl = 'https://api.kucoin.com/api/v1/market/allTickers';
    this.fetcherName = FetcherName.KuCoinPrice;
  }

  protected parseResponse(axiosResponse: AxiosResponse): SymbolParsedResponse[] {
    if (axiosResponse.status !== 200) {
      this.logger.error(`${this.logPrefix} status ${axiosResponse.status}`);
      return [];
    }

    return (axiosResponse.data.data as KuCoinResponse).ticker
      .map(({symbol, last}) => {
        const value = parseFloat(last);

        if (isNaN(value)) {
          this.logger.warn(`${this.logPrefix} NaN: ${symbol}: ${last}`);
          return;
        }

        this.logger.debug(`${this.logPrefix} fetched ${symbol}: ${value}`);

        return {symbol, price: value};
      })
      .filter((e) => !!e) as SymbolParsedResponse[];
  }
}
