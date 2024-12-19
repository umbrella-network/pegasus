import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';
import TimeService from '../../services/TimeService.js';
import {CandlestickRepository, CandlestickSearchInput} from '../../repositories/fetchers/CandlestickRepository.js';
import {KuCoinPriceInputParams} from '../../services/fetchers/KuCoinPriceGetter.js';
import {CandlestickModel} from '../../models/fetchers/CandlestickModel.js';
import {FetcherName} from '../../types/fetchers.js';

export type KuCoinCandlestickInterval =
  | '1min'
  | '3min'
  | '5min'
  | '15min'
  | '30min'
  | '1hour'
  | '2hour'
  | '4hour'
  | '6hour'
  | '8hour'
  | '12hour'
  | '1day'
  | '1week'
  | '1month';

type CandlestickResponse = [
  string, //Start time of the candle cycle
  string, //opening price
  string, //closing price
  string, //highest price
  string, //lowest price
  string, //Transaction volume
  string, //Transaction amount
];

export type KuCoinCandlestick = {
  symbol: string;
  interval: KuCoinCandlestickInterval;

  openTime: number; // Kline open time
  openPrice: number; // Open price, parseFloat
  closePrice: number; // Close price
  highPrice: number; // High price
  lowPrice: number; // Low price
  volume: number; // Volume
  amount: number; // Transaction amount
};

@injectable()
export class KuCoinCandlestickFetcher {
  @inject(CandlestickRepository) candlestickRepository!: CandlestickRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private timeout: number;
  private logPrefix = '[KuCoinCandlestickFetcher]';
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.binance.timeout;
  }

  async apply(params: KuCoinPriceInputParams[], timestamp: number): Promise<(CandlestickModel | undefined)[]> {
    try {
      return await this.fetchCandlesticks(timestamp, params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }

    return [];
  }

  private async fetchCandlesticks(
    timestamp: number,
    params: KuCoinPriceInputParams[],
  ): Promise<(CandlestickModel | undefined)[]> {
    const candleParams = params.map((p): CandlestickSearchInput => {
      return {
        fetcher: FetcherName.KuCoinCandlestick,
        params: {
          symbol: p.symbol,
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

        this.logger.debug(`${this.logPrefix} pulling candle for: ${params[i].symbol} for ${interval}`);
        return candle != undefined ? candle : this.fetchCandlestick(timestamp, params[i].symbol, interval);
      }),
    );

    return results.map((r) => {
      return r.status == 'fulfilled' ? r.value : undefined;
    });
  }

  /*
  https://api.kucoin.com/api/v1/market/candles?type=1day&symbol=BTC-USDC&startAt=1734220800&endAt=1734220801
  response is = 68.1089123 => Vol(BTC)
   */
  private async fetchCandlestick(
    timestamp: number,
    symbol: string,
    interval: KuCoinCandlestickInterval,
  ): Promise<CandlestickModel | undefined> {
    const startTime = this.candlestickRepository.beginOfIntervalSec(this.intervalToSeconds(interval), timestamp);
    const endAt = startTime + 1;
    const api = 'https://api.kucoin.com';
    const url = `${api}/api/v1/market/candles?symbol=${symbol}&type=${interval}&startAt=${startTime}&endAt=${endAt}`;

    this.logger.debug(`${this.logPrefix} call for: ${url}`);

    const response = await axios.get(url, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${url}`,
    });

    if (response.status !== 200) {
      this.logger.error(`${this.logPrefix} status ${response.status}`);
      return;
    }

    const parsed = this.parseCandlestickResponse(symbol, interval, response);
    await this.saveCandles(parsed);

    return {
      symbol,
      value: parsed?.volume,
    } as unknown as CandlestickModel;
  }

  private parseCandlestickResponse(
    symbol: string,
    interval: KuCoinCandlestickInterval,
    axiosResponse: AxiosResponse,
  ): KuCoinCandlestick | undefined {
    if (axiosResponse.status !== 200) {
      this.logger.error(`${this.logPrefix} status ${axiosResponse.status}`);
      return undefined;
    }

    return (axiosResponse.data.data as CandlestickResponse[]).map((item) => {
      this.logger.debug(`${this.logPrefix} map ${item}`);
      return this.toCandlestick(symbol, interval, item);
    })[0];
  }

  private async saveCandles(parsed: KuCoinCandlestick | undefined): Promise<void> {
    if (!parsed) return;

    const data = {
      fetcher: FetcherName.KuCoinCandlestick,
      params: {
        symbol: parsed.symbol,
        timestamp: parsed.openTime,
        value: parsed.volume,
        interval: this.intervalToSeconds(parsed.interval),
      },
    };

    this.logger.debug(`${this.logPrefix} saved candle: ${JSON.stringify(data)}`);
    await this.candlestickRepository.save([data]);
  }

  private toCandlestick(
    symbol: string,
    interval: KuCoinCandlestickInterval,
    data: CandlestickResponse,
  ): KuCoinCandlestick | undefined {
    this.logger.debug(`${this.logPrefix} toCandlestick ${data}`);

    const c: KuCoinCandlestick = {
      symbol,
      interval,

      openTime: parseInt(data[0]),
      openPrice: parseFloat(data[1]),
      closePrice: parseFloat(data[2]),
      highPrice: parseFloat(data[3]),
      lowPrice: parseFloat(data[4]),
      volume: parseFloat(data[5]),
      amount: parseFloat(data[6]),
    };

    if (isNaN(c.volume)) {
      this.logger.error(`${this.logPrefix} toCandlestick fail for ${symbol}`);
      return undefined;
    }

    return c;
  }

  private intervalToSeconds(i: KuCoinCandlestickInterval): number {
    switch (i) {
      case '1min':
        return 60;
      case '3min':
        return 3 * 60;
      case '5min':
        return 5 * 60;
      case '15min':
        return 15 * 60;
      case '30min':
        return 30 * 60;
      case '1hour':
        return 60 * 60;
      case '2hour':
        return 60 * 60 * 2;
      case '4hour':
        return 60 * 60 * 4;
      case '6hour':
        return 60 * 60 * 6;
      case '8hour':
        return 60 * 60 * 8;
      case '12hour':
        return 60 * 60 * 12;
      case '1day':
        return 60 * 60 * 24;
      case '1week':
        return 60 * 60 * 24 * 7;
      case '1month':
        return 60 * 60 * 24 * 30;
    }

    throw new Error(`unknown ${this.logPrefix}: ${i}`);
  }
}
