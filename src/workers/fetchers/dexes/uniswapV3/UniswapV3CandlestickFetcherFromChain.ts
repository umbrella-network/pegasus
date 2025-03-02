import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../../../types/Settings.js';
import TimeService from '../../../../services/TimeService.js';
import {
  CandlestickRepository,
  CandlestickRepositoryInput,
  CandlestickSearchInput,
} from '../../../../repositories/fetchers/CandlestickRepository.js';
import {CandlestickModel} from '../../../../models/fetchers/CandlestickModel.js';
import {FetcherName} from '../../../../types/fetchers.js';
import {UniswapV3FetcherInputParams} from '../../../../services/fetchers/UniswapV3Getter.js';
import {UniswapV3PoolRepository} from '../../../../repositories/UniswapV3PoolRepository.js';
import {DexProtocolName} from '../../../../types/Dexes.js';
import {GraphClient} from '../../../../services/graph/GraphClient.js';
import {SubgraphCandlestickResponse, uniswapCandlestickSubgraphQuery} from './GraphQueries.js';
import {ChainsIds} from '../../../../types/ChainsIds.js';

export type UniswapV3CandlestickInterval = '1day';

type PoolWithQuote = {pool: string; quote: string} | undefined;

export type UniswapV3Candlestick = {
  symbol: string;
  interval: UniswapV3CandlestickInterval;
  volume: number; // Volume
  openTime: number;
};

@injectable()
export class UniswapV3CandlestickFetcherFromChain {
  @inject(CandlestickRepository) candlestickRepository!: CandlestickRepository;
  @inject(UniswapV3PoolRepository) poolRepository!: UniswapV3PoolRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject(GraphClient) graphClient!: GraphClient;
  @inject('Logger') private logger!: Logger;
  @inject('Settings') settings!: Settings;

  private logPrefix = '[UniswapV3CandlestickFetcherFromChain]';
  static fetcherSource = '';

  async apply(
    chainId: ChainsIds,
    params: UniswapV3FetcherInputParams[],
    timestamp: number,
  ): Promise<(CandlestickModel | undefined)[]> {
    if (params.find((p) => p.fromChain != chainId) != undefined) {
      this.logger.error(`${this.logPrefix}[${chainId}] chain ID mismatch`);
    }

    try {
      return await this.fetchCandlesticks(
        chainId,
        timestamp,
        params.filter((p) => p.fromChain == chainId),
      );
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }

    return [];
  }

  private async fetchCandlesticks(
    chainId: ChainsIds,
    timestamp: number,
    params: UniswapV3FetcherInputParams[],
  ): Promise<(CandlestickModel | undefined)[]> {
    if (params.length == 0) return [];

    const poolsWithQuote = await this.getPoolsWithQuote(params);
    const symbols = params.map((p, i) => this.toCandlestickSymbol(p.fromChain, poolsWithQuote[i]?.pool));

    const candleParams = params.map((p, ix): CandlestickSearchInput => {
      const poolAddr = poolsWithQuote[ix]?.pool;

      return {
        fetcher: FetcherName.UniswapV3Candlestick, // this.getFetcherName(chainId),
        params: {
          symbol: this.toCandlestickSymbol(p.fromChain, poolAddr),
          interval: p.vwapInterval ? this.intervalToSeconds(p.vwapInterval) : 0,
          timestamp,
        },
      };
    });

    const existing = await this.candlestickRepository.getMany(timestamp, candleParams);
    let needToPull = false;

    const missingCandles = existing.map((candle, i) => {
      const interval = params[i].vwapInterval;

      if (candle != undefined) return undefined;
      if (interval == undefined) return undefined;
      if (poolsWithQuote[i] == undefined) return undefined;

      this.logger.debug(`${this.logPrefix} pulling candle for: ${symbols[i]} for ${params[i].vwapInterval}`);
      needToPull = true;

      return poolsWithQuote[i];
    });

    if (!needToPull) return existing;

    await this.fetchCandlestickFromGraph(chainId, timestamp, missingCandles);
    return this.candlestickRepository.getMany(timestamp, candleParams);
  }

  private async fetchCandlestickFromGraph(
    chainId: ChainsIds,
    timestamp: number,
    poolsWithQuote: PoolWithQuote[],
  ): Promise<void> {
    const startTime = this.candlestickRepository.beginOfIntervalSec(this.intervalToSeconds('1day'), timestamp);
    const pools = poolsWithQuote.filter((p) => p != undefined).map((p) => p?.pool);

    const response = await this.graphClient.query(
      this.getSubgraphURL(chainId),
      uniswapCandlestickSubgraphQuery(pools as string[], startTime),
    );

    const parsed = this.parseSubgraphResponse(chainId, poolsWithQuote, response as SubgraphCandlestickResponse);
    await this.saveCandles(parsed);
  }

  private parseSubgraphResponse(
    chainId: ChainsIds,
    poolsWithQuote: PoolWithQuote[],
    subgraphData: SubgraphCandlestickResponse,
  ): UniswapV3Candlestick[] {
    const poolQuoteMap: Record<string, string> = {};

    poolsWithQuote.forEach((item) => {
      if (item == undefined) return;

      poolQuoteMap[item.pool] = item.quote;
    });

    return subgraphData.data.poolDayDatas.map((item): UniswapV3Candlestick => {
      const quote = poolQuoteMap[item.pool.id];

      return {
        symbol: this.toCandlestickSymbol(chainId, item.pool.id),
        interval: '1day',
        volume: parseFloat(item.pool.token0 == quote ? item.volumeToken0 : item.volumeToken1),
        openTime: item.date,
      };
    });
  }

  private async saveCandles(toSave: (UniswapV3Candlestick | undefined)[]): Promise<void> {
    const data = (toSave.filter((parsed) => parsed != undefined) as UniswapV3Candlestick[]).map(
      (parsed: UniswapV3Candlestick): CandlestickRepositoryInput => {
        return {
          fetcher: FetcherName.UniswapV3Candlestick, // this.getFetcherName(chainId),
          params: {
            symbol: parsed.symbol,
            timestamp: parsed.openTime,
            value: parsed.volume,
            interval: this.intervalToSeconds(parsed.interval),
          },
        };
      },
    );

    await this.candlestickRepository.save(data);
  }

  private intervalToSeconds(i: UniswapV3CandlestickInterval): number {
    switch (i) {
      case '1day':
        return 60 * 60 * 24;
    }

    throw new Error(`unknown ${this.logPrefix}: ${i}`);
  }

  protected toCandlestickSymbol(chainId: ChainsIds | string, poolAddress: string | undefined): string {
    return `${chainId}:${poolAddress ?? '_'}`;
  }

  protected getSubgraphURL(chainId: ChainsIds): string {
    return this.settings.dexes?.[chainId]?.[DexProtocolName.UNISWAP_V3]?.subgraphUrl || '';
  }

  protected async getPoolsWithQuote(params: UniswapV3FetcherInputParams[]): Promise<PoolWithQuote[]> {
    const poolsForParams = await Promise.all(
      params.map((p) => {
        return this.poolRepository.findBestPool({
          ...p,
          protocol: DexProtocolName.UNISWAP_V3,
        });
      }),
    );

    return poolsForParams.map((p, i) => {
      if (!p) return undefined;

      return {
        pool: p.address,
        quote: params[i].quote,
      };
    });
  }
}
