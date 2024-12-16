import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {CategorySymbolListV5, GetKlineParamsV5, KlineIntervalV3, RestClientV5, CategoryV5} from 'bybit-api';

import Settings from '../../types/Settings.js';
import TimeService from '../../services/TimeService.js';
import {
  CandlestickRepository,
  CandlestickRepositoryInput,
  CandlestickSearchInput,
} from '../../repositories/fetchers/CandlestickRepository.js';
import {CandlestickModel} from '../../models/fetchers/CandlestickModel.js';
import {ByBitPriceInputParams} from '../../services/fetchers/ByBitPriceGetter.js';
import {FetcherName} from '../../types/fetchers.js';

/*
category	string	Product type
symbol	string	Symbol name
list	array
An string array of individual candle
Sort in reverse by startTime
> list[0]: startTime	string	Start time of the candle (ms)
> list[1]: openPrice	string	Open price
> list[2]: highPrice	string	Highest price
> list[3]: lowPrice	string	Lowest price
> list[4]: closePrice	string	Close price. Is the last traded price when the candle is not closed
> list[5]: volume	string	Trade volume. Unit of contract: pieces of contract. Unit of spot: quantity of coins
> list[6]: turnover	string	Turnover. Unit of figure: quantity of quota coin
 */
export type ByBitCandlestick = {
  category: string;
  symbol: string;
  candle: {
    startTime: number; // string, Start time of the candle (ms)
    openPrice: number; // string, Open price
    highPrice: number; // string, Highest price
    lowPrice: number; // string, Lowest price
    closePrice: number; // string, Close price. Is the last traded price when the candle is not closed
    volume: number; // string, Trade volume. Unit of contract: pieces of contract. Unit of spot: quantity of coins
    turnover: number; // string, Turnover. Unit of figure: quantity of quota coin
  };
};

@injectable()
export class BybitCandlestickFetcher {
  @inject(CandlestickRepository) candlestickRepository!: CandlestickRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private timeout: number;
  private logPrefix = '[BybitCandlestickFetcher]';
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.binance.timeout;
  }

  async apply(params: ByBitPriceInputParams[], timestamp: number): Promise<(CandlestickModel | undefined)[]> {
    try {
      return await this.fetchCandlesticks(timestamp, params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }

    return [];
  }

  private async fetchCandlesticks(
    timestamp: number,
    params: ByBitPriceInputParams[],
  ): Promise<(CandlestickModel | undefined)[]> {
    const candleParams: CandlestickSearchInput[] = params.map((p) => {
      return {
        fetcher: FetcherName.ByBitCandlestick,
        params: {
          symbol: p.vwapSymbol ?? '',
          interval: p.vwapInterval ? this.intervalToSeconds(p.vwapInterval) : 0,
          timestamp,
        },
      };
    });

    const existing = await this.candlestickRepository.getMany(timestamp, candleParams);

    const results = await Promise.allSettled(
      existing.map((candle, i) => {
        if (candle != undefined) return candle;

        const interval = params[i].vwapInterval;

        if (!interval) {
          return undefined;
        }
        
        const symbol = params[i].vwapSymbol;

        if (!symbol) {
          return undefined;
        }

        const startTime = this.candlestickRepository.beginOfIntervalSec(this.intervalToSeconds(interval), timestamp);

        const klineParams: GetKlineParamsV5 = {
          category: params[i].vwapCategory || 'spot',
          limit: 1,
          interval,
          symbol,
          start: startTime * 1000,
        };

        this.logger.debug(
          `${this.logPrefix} pulling candle for: ${params[i].symbol} for ${JSON.stringify(klineParams)}`,
        );

        return candle != undefined ? candle : this.fetchCandlestick(klineParams);
      }),
    );

    return results.map((r) => {
      return r.status == 'fulfilled' ? r.value : undefined;
    });
  }

  /*
  https://api.bybit.com/v5/market/kline?category=spot&symbol=BTCUSDC&interval=D&start=1734220800000
  response is volume = "1042.851483", Vol(BTC)
  for same time Binace has volume "2238.50824000"
   */
  private async fetchCandlestick(params: GetKlineParamsV5): Promise<CandlestickModel | undefined> {
    const client = new RestClientV5({
      testnet: false,
    });

    try {
      this.logger.debug(`${this.logPrefix} call for ${JSON.stringify(params)}`);

      const response = await client.getKline(params);

      if (response.retMsg != 'OK') {
        this.logger.error(`${this.logPrefix} error [${response.retCode}] ${response.retMsg}`);
        return;
      }

      const parsed = this.toCandlestick(response.result as unknown as CategorySymbolListV5<string[], CategoryV5>);
      await this.saveCandles(params.interval, parsed);

      return {
        symbol: parsed?.symbol,
        value: parsed?.candle.volume,
      } as unknown as CandlestickModel;
    } catch (e) {
      this.logger.error(`${this.logPrefix} error: ${JSON.stringify(e)}`);
    }
  }

  private async saveCandles(interval: KlineIntervalV3, parsed: ByBitCandlestick | undefined): Promise<void> {
    if (!parsed) return;

    const data: CandlestickRepositoryInput = {
      fetcher: FetcherName.ByBitCandlestick,
      params: {
        timestamp: parsed.candle.startTime,
        symbol: parsed.symbol,
        interval: this.intervalToSeconds(interval),
        value: parsed.candle.volume,
      },
    };

    this.logger.debug(`${this.logPrefix} saved candle: ${JSON.stringify(data)}`);
    await this.candlestickRepository.save([data]);
  }

  private toCandlestick(data: CategorySymbolListV5<string[], CategoryV5>): ByBitCandlestick | undefined {
    const c: ByBitCandlestick = {
      symbol: data.symbol,
      category: data.category,
      candle: {
        startTime: Math.trunc(parseInt(data.list[0][0]) / 1000),
        openPrice: parseFloat(data.list[0][1]),
        highPrice: parseFloat(data.list[0][2]),
        lowPrice: parseFloat(data.list[0][3]),
        closePrice: parseFloat(data.list[0][4]),
        volume: parseFloat(data.list[0][5]),
        turnover: parseFloat(data.list[0][6]),
      },
    };

    if (isNaN(c.candle.volume)) {
      this.logger.error(
        `${this.logPrefix} toCandlestick fail for ${data.symbol}: ${JSON.stringify(data)} => ${JSON.stringify(c)}`,
      );
      return undefined;
    }

    return c;
  }

  private intervalToSeconds(i: KlineIntervalV3): number {
    switch (i.toString()) {
      case '1':
        return 60;
      case '3':
        return 3 * 60;
      case '5':
        return 5 * 60;
      case '15':
        return 15 * 60;
      case '30':
        return 30 * 60;
      case '60':
        return 60 * 60;
      case '120':
        return 120 * 60;
      case '240':
        return 240 * 60;
      case '360':
        return 360 * 60;
      case '720':
        return 720 * 60;
      case 'D':
        return 60 * 60 * 24;
      case 'W':
        return 60 * 60 * 24 * 7;
      case 'M':
        return 60 * 60 * 24 * 30;
    }

    throw new Error(`${this.logPrefix} intervalToSeconds unknown: ${i}`);
  }
}
