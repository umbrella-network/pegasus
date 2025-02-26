import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../../../types/Settings.js';
import TimeService from '../../../../services/TimeService.js';
import {
  CandlestickRepository,
  CandlestickSearchInput,
} from '../../../../repositories/fetchers/CandlestickRepository.js';
import {CandlestickModel} from '../../../../models/fetchers/CandlestickModel.js';
import {FetcherName} from '../../../../types/fetchers.js';
import {UniswapV3FetcherInputParams} from '../../../../services/fetchers/UniswapV3Getter.js';
import {UniswapV3PoolRepository} from '../../../../repositories/UniswapV3PoolRepository.js';
import {DexProtocolName} from '../../../../types/Dexes';
import {GraphClient} from '../../../../services/graph/GraphClient';
import {uniswapCandlestickSubgraphQuery} from './GraphQueries';
import {ChainsIds} from '../../../../types/ChainsIds';

export type UniswapV2CandlestickInterval = '1day';

type CandlestickResponse = [
  string, //Start time of the candle cycle
  string, //opening price
  string, //closing price
  string, //highest price
  string, //lowest price
  string, //Transaction volume
  string, //Transaction amount
];

export type UniswapV3Candlestick = {
  symbol: string;
  interval: UniswapV2CandlestickInterval;

  openTime: number; // Kline open time
  openPrice: number; // Open price, parseFloat
  closePrice: number; // Close price
  highPrice: number; // High price
  lowPrice: number; // Low price
  volume: number; // Volume
  amount: number; // Transaction amount
};

@injectable()
export class UniswapV3CandlestickFetcher {
  @inject(CandlestickRepository) candlestickRepository!: CandlestickRepository;
  @inject(UniswapV3PoolRepository) poolRepository!: UniswapV3PoolRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject(GraphClient) graphClient!: GraphClient;
  @inject('Logger') private logger!: Logger;
  @inject('Settings') settings!: Settings;

  private timeout: number;
  private logPrefix = '[UniswapV3CandlestickFetcher]';
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.binance.timeout;
  }

  async apply(params: UniswapV3FetcherInputParams[], timestamp: number): Promise<(CandlestickModel | undefined)[]> {
    try {
      return await this.fetchCandlesticks(timestamp, params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }

    return [];
  }

  private async fetchCandlesticks(
    timestamp: number,
    params: UniswapV3FetcherInputParams[],
  ): Promise<(CandlestickModel | undefined)[]> {
    const pools = await Promise.all(
      params.map((p) => {
        return this.poolRepository.findBestPool({
          ...p,
          protocol: DexProtocolName.UNISWAP_V3,
        });
      }),
    );

    const symbols = params.map((p, i) => this.toCandlestickSymbol(p, pools[i]?.address));

    const candleParams = params.map((p, ix): CandlestickSearchInput => {
      const poolAddr = pools[ix]?.address;

      return {
        fetcher: FetcherName.UniswapV3,
        params: {
          symbol: this.toCandlestickSymbol(p, poolAddr),
          interval: p.vwapInterval ? this.intervalToSeconds(p.vwapInterval) : 0,
          timestamp,
        },
      };
    });

    const existing = await this.candlestickRepository.getMany(timestamp, candleParams);

    const poolsToPull = existing.map((candle, i) => {
      const interval = params[i].vwapInterval;

      if (candle != undefined) return undefined;
      if (interval == undefined) return undefined;
      if (pools[i] == undefined) return undefined;

      this.logger.debug(`${this.logPrefix} pulling candle for: ${symbols[i]} for ${params[i].vwapInterval}`);

      return {
        poolAddress: pools[i]?.address,
        interval: this.intervalToSeconds(interval),
      };
    });

    const results = await this.fetchCandlestick(timestamp, poolsToPull);

    return results.map((r) => {
      return r.status == 'fulfilled' ? r.value : undefined;
    });
  }

  /*
  https://api.kucoin.com/api/v1/market/candles?type=1day&symbol=BTC-USDC&startAt=1734220800&endAt=1734220801
  response is = 68.1089123 => Vol(BTC)
   */
  private async fetchCandlestick(
    chainId: ChainsIds,
    timestamp: number,
    params: {poolAddress: string[]; interval: number},
  ): Promise<CandlestickModel | undefined> {
    // TODO use subgraph
    await this.graphClient.query(this.getSubgraphURL(chainId), uniswapCandlestickSubgraphQuery(params.poolAddress, 1));

    const startTime = this.candlestickRepository.beginOfIntervalSec(this.intervalToSeconds(interval), timestamp);
    const endAt = startTime + this.intervalToSeconds(interval) - 1;

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
    interval: UniswapV2CandlestickInterval,
    axiosResponse: AxiosResponse,
  ): UniswapV3Candlestick | undefined {
    if (axiosResponse.status !== 200) {
      this.logger.error(`${this.logPrefix} status ${axiosResponse.status}`);
      return undefined;
    }

    return (axiosResponse.data.data as CandlestickResponse[]).map((item) => {
      this.logger.debug(`${this.logPrefix} map ${item}`);
      return this.toCandlestick(symbol, interval, item);
    })[0];
  }

  private async saveCandles(parsed: UniswapV3Candlestick | undefined): Promise<void> {
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

  private intervalToSeconds(i: UniswapV2CandlestickInterval): number {
    switch (i) {
      case '1day':
        return 60 * 60 * 24;
    }

    throw new Error(`unknown ${this.logPrefix}: ${i}`);
  }

  protected toCandlestickSymbol(p: UniswapV3FetcherInputParams, poolAddress: string | undefined): string {
    return `pool::${poolAddress ?? '_'}`;
  }

  protected getSubgraphURL(chainId: ChainsIds): string {
    return this.settings.dexes?.[chainId]?.[DexProtocolName.UNISWAP_V3]?.subgraphUrl || '';
  }
}
