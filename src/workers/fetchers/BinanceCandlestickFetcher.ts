import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';
import TimeService from '../../services/TimeService.js';
import {
  CandlestickRepository,
  CandlestickSearchInput,
} from '../../repositories/fetchers/CandlestickRepository.js';
import {BinancePriceInputParams} from '../../services/fetchers/BinancePriceGetter.js';
import {CandlestickModel} from '../../models/fetchers/CandlestickModel.js';
import {FetcherName} from '../../types/fetchers.js';

export type BinanceCandlestickInterval =
  | '1s'
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '8h'
  | '12h'
  | '1d'
  | '3d'
  | '1w'
  | '1M';

type CandlestickResponse = [
  number, // Kline open time
  string, // Open price, parseFloat
  string, // High price
  string, // Low price
  string, // Close price
  string, // Volume
  number, // Kline Close time
  string, // Quote asset volume
  number, // Number of trades
  string, // Taker buy base asset volume
  string, // Taker buy quote asset volume
  string, // Unused field, ignore.
];

export type BinanceCandlestick = {
  symbol: string;
  interval: BinanceCandlestickInterval;

  openTime: number; // Kline open time
  openPrice: number; // Open price, parseFloat
  highPrice: number; // High price
  lowPrice: number; // Low price
  closePrice: number; // Close price
  volume: number; // Volume
  closeTime: number; // Kline Close time
  quoteAssetVolume: number; // Quote asset volume
  nOfTrades: number; // Number of trades
  buyBaseAssetVolume: number; // Taker buy base asset volume
  buyQuoteAssetVolume: number; // Taker buy quote asset volume
};

@injectable()
export class BinanceCandlestickFetcher {
  @inject(CandlestickRepository) candlestickRepository!: CandlestickRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private timeout: number;
  private logPrefix = '[BinanceCandlestickFetcher]';
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.binance.timeout;
  }

  async apply(timestamp: number, params: BinancePriceInputParams[]): Promise<(CandlestickModel | undefined)[]> {
    try {
      return await this.fetchCandlesticks(timestamp, params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }

    return [];
  }

  private async fetchCandlesticks(
    timestamp: number,
    params: BinancePriceInputParams[],
  ): Promise<(CandlestickModel | undefined)[]> {
    const candleParams = params.map((p): CandlestickSearchInput => {
      return {
        fetcher: FetcherName.BinanceCandlestick,
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

  private async fetchCandlestick(
    timestamp: number,
    symbol: string,
    interval: BinanceCandlestickInterval,
  ): Promise<CandlestickModel | undefined> {
    const startTime = this.candlestickRepository.beginOfIntervalSec(this.intervalToSeconds(interval), timestamp) * 1000;
    const api = 'https://www.binance.com/api/v3';
    const url = `${api}/klines?symbol=${symbol}&interval=${interval}&startTime=${startTime}&limit=1`;

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
    interval: BinanceCandlestickInterval,
    axiosResponse: AxiosResponse,
  ): BinanceCandlestick | undefined {
    if (axiosResponse.status !== 200) {
      this.logger.error(`${this.logPrefix} status ${axiosResponse.status}`);
      return undefined;
    }

    return (axiosResponse.data as CandlestickResponse[]).map((item) => {
      return this.toCandlestick(symbol, interval, item);
    })[0];
  }

  private async saveCandles(parsed: BinanceCandlestick | undefined): Promise<void> {
    if (!parsed) return;

    const data = {
      fetcher: FetcherName.BinanceCandlestick,
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
    interval: BinanceCandlestickInterval,
    data: CandlestickResponse,
  ): BinanceCandlestick | undefined {
    const c: BinanceCandlestick = {
      symbol,
      interval,

      openTime: Math.trunc(data[0] / 1000),
      openPrice: parseFloat(data[1]),
      highPrice: parseFloat(data[2]),
      lowPrice: parseFloat(data[3]),
      closePrice: parseFloat(data[4]),
      volume: parseFloat(data[5]),
      closeTime: Math.trunc(data[6] / 1000),
      quoteAssetVolume: parseFloat(data[7]),
      nOfTrades: data[8],
      buyBaseAssetVolume: parseFloat(data[9]),
      buyQuoteAssetVolume: parseFloat(data[10]),
    };

    if (isNaN(c.volume)) {
      this.logger.error(`${this.logPrefix} toCandlestick fail for ${symbol}`);
      return undefined;
    }

    return c;
  }

  private intervalToSeconds(i: BinanceCandlestickInterval): number {
    switch (i) {
      case '1s':
        return 1;
      case '1m':
        return 60;
      case '3m':
        return 3 * 60;
      case '5m':
        return 5 * 60;
      case '15m':
        return 15 * 60;
      case '30m':
        return 30 * 60;
      case '1h':
        return 60 * 60;
      case '2h':
        return 60 * 60 * 2;
      case '4h':
        return 60 * 60 * 4;
      case '6h':
        return 60 * 60 * 6;
      case '8h':
        return 60 * 60 * 8;
      case '12h':
        return 60 * 60 * 12;
      case '1d':
        return 60 * 60 * 24;
      case '3d':
        return 60 * 60 * 24 * 3;
      case '1w':
        return 60 * 60 * 24 * 7;
      case '1M':
        return 60 * 60 * 24 * 30;
    }

    throw new Error(`unknown ${this.logPrefix}: ${i}`);
  }
}
