import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {RestClientV5, KlineIntervalV3} from 'bybit-api';

import Settings from '../../types/Settings.js';
import TimeService from '../../services/TimeService.js';
import {CandlestickRepository} from '../../repositories/fetchers/CandlestickRepository.js';
import {BinancePriceInputParams} from '../../services/fetchers/BinancePriceGetter.js';
import {CandlestickModel} from '../../models/fetchers/CandlestickModel.js';
import {ByBitPriceInputParams} from "../../services/fetchers/ByBitPriceGetter";


export type BinanceCandlestick = {
  symbol: string;
  interval: KlineIntervalV3;

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

  async apply(timestamp: number, params: ByBitPriceInputParams[]): Promise<(CandlestickModel | undefined)[]> {
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
    const existing = await this.candlestickRepository.getMany(timestamp, params);

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
    interval: KlineIntervalV3,
  ): Promise<CandlestickModel | undefined> {
    const client = new RestClientV5({
      testnet: true,
    });

    client
      .getKline({
        category: 'inverse',
        symbol: 'BTCUSD',
        interval: '60',
        start: 1670601600000,
        end: 1670608800000,
      })
      .then((response) => {
        console.log(response);
      })
      .catch((error) => {
        console.error(error);
      });

    const startTime = this.candlestickRepository.beginOfIntervalMs(interval, timestamp);
    const api = 'https://www.binance.com/v5/market/kline';
    const url = `${api}?symbol=${symbol}&interval=${interval}&startTime=${startTime}&limit=1`;

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
    interval: KlineIntervalV3,
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
    interval: KlineIntervalV3,
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
