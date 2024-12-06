import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';
import TimeService from '../../services/TimeService.js';
import {BinanceCandlestickRepository} from '../../repositories/fetchers/BinanceCandlestickRepository.js';
import {BinancePriceInputParams} from '../../services/fetchers/BinancePriceGetter.js';
import {CandlestickModel_Binance} from '../../models/fetchers/CandlestickModel_Binance.js';

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
  @inject(BinanceCandlestickRepository) candlestickRepository!: BinanceCandlestickRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private timeout: number;
  private logPrefix = '[BinanceCandlestickFetcher]';
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.binance.timeout;
  }

  async apply(timestamp: number, params: BinancePriceInputParams[]): Promise<(CandlestickModel_Binance | undefined)[]> {
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
  ): Promise<(CandlestickModel_Binance | undefined)[]> {
    const existing = await this.candlestickRepository.getMany(timestamp, params);

    this.logger.debug(
      `${this.logPrefix} existing candles: ${JSON.stringify(
        existing.map((e) => {
          return e ? {symbol: e.symbol, volume: e.value} : {};
        }),
      )}`,
    );

    const results = await Promise.allSettled(
      existing.map((candle, i) => {
        if (candle != undefined) return candle;

        const interval = params[i].vwapInterval;

        if (!interval) {
          this.logger.debug(`${this.logPrefix} vwapInterval not set for ${params[i].symbol}`);
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
  ): Promise<CandlestickModel_Binance | undefined> {
    const startTime = this.candlestickRepository.beginOfIntervalMs(interval);
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
    } as unknown as CandlestickModel_Binance;
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
      timestamp: parsed.openTime,
      value: parsed.volume,
      params: {
        symbol: parsed.symbol,
        interval: parsed.interval,
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
}
