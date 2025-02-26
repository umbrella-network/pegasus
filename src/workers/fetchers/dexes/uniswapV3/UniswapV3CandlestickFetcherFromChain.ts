import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../../../types/Settings.js';
import TimeService from '../../../../services/TimeService.js';
import {
  CandlestickRepository, CandlestickRepositoryInput,
  CandlestickSearchInput,
} from '../../../../repositories/fetchers/CandlestickRepository.js';
import {CandlestickModel} from '../../../../models/fetchers/CandlestickModel.js';
import {FetcherName} from '../../../../types/fetchers.js';
import {UniswapV3FetcherInputParams} from '../../../../services/fetchers/UniswapV3Getter.js';
import {UniswapV3PoolRepository} from '../../../../repositories/UniswapV3PoolRepository.js';
import {DexProtocolName} from '../../../../types/Dexes';
import {GraphClient} from '../../../../services/graph/GraphClient';
import {SubgraphCandlestickResponse, uniswapCandlestickSubgraphQuery} from './GraphQueries';
import {ChainsIds} from '../../../../types/ChainsIds';

export type UniswapV3CandlestickInterval = '1day';

type PoolWithQuote = { pool: string, quote: string } | undefined

type CandlestickResponse = {
  data: {
    poolDayDatas: [
      {
        date: number;
        volumeToken0: string;
        volumeToken1: string;
        pool: {
          id: string;
        };
      },
    ];
  };
};

export type UniswapV3Candlestick = {
  symbol: string;
  interval: UniswapV3CandlestickInterval;
  volume: number; // Volume
  openTime: number
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
        timestamp,
        params.filter((p) => p.fromChain == chainId),
      );
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }

    return [];
  }

  private async fetchCandlesticks(
    timestamp: number,
    params: UniswapV3FetcherInputParams[],
  ): Promise<(CandlestickModel | undefined)[]> {
    if (params.length == 0) return [];

    const poolsWithQuote = await this.getPoolsWithQuote(params);

    const symbols = params.map((p, i) => this.toCandlestickSymbol(p.fromChain, poolsWithQuote[i]?.pool));

    const candleParams = params.map((p, ix): CandlestickSearchInput => {
      const poolAddr = poolsWithQuote[ix]?.pool;

      return {
        fetcher: FetcherName.UniswapV3,
        params: {
          symbol: this.toCandlestickSymbol(p.fromChain, poolAddr),
          interval: p.vwapInterval ? this.intervalToSeconds(p.vwapInterval) : 0,
          timestamp,
        },
      };
    });

    const existing = await this.candlestickRepository.getMany(timestamp, candleParams);

    const missingCandles = existing.map((candle, i) => {
      const interval = params[i].vwapInterval;

      if (candle != undefined) return undefined;
      if (interval == undefined) return undefined;
      if (poolsWithQuote[i] == undefined) return undefined;

      this.logger.debug(`${this.logPrefix} pulling candle for: ${symbols[i]} for ${params[i].vwapInterval}`);

      return poolsWithQuote[i];
    });

    const results = await this.fetchCandlestickFromGraph(params, timestamp, missingCandles);

    return results.map((r) => {
      return r.status == 'fulfilled' ? r.value : undefined;
    });
  }

  private async fetchCandlestickFromGraph(
    params: UniswapV3FetcherInputParams[],
    timestamp: number,
    poolsWithQuote: PoolWithQuote[],
  ): Promise<(CandlestickModel | undefined)[]> {
    if (params.length != poolsWithQuote.length) {
      throw new Error(`${this.logPrefix} params vs poolsWithQuote: length mismatch`);
    }

    const chainId = params[0].fromChain as ChainsIds;
    const startTime = this.candlestickRepository.beginOfIntervalSec(this.intervalToSeconds('1day'), timestamp);
    const pools = poolsWithQuote.filter((p) => !p).map((p) => p?.pool);

    const response = await this.graphClient.query(
      this.getSubgraphURL(chainId),
      uniswapCandlestickSubgraphQuery(pools as string[], startTime),
    );

    const parsed = this.parseSubgraphResponse(chainId, poolsWithQuote, response as SubgraphCandlestickResponse);
    await this.saveCandles(parsed);

    return params.map(p => {
      return {
        symbol: this.toCandlestickSymbol(chainId, p.),
        value: parsed?.volume,
      };
    });
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
    const data = (toSave
      .filter(parsed => parsed != undefined) as UniswapV3Candlestick[])
      .map((parsed: UniswapV3Candlestick): CandlestickRepositoryInput => {
        return {
          fetcher: FetcherName.UniswapV3Candlestick,
          params: {
            symbol: parsed.symbol,
            timestamp: parsed.openTime,
            value: parsed.volume,
            interval: this.intervalToSeconds(parsed.interval),
          },
        };
      });

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
    return `${chainId}::${poolAddress ?? '_'}`;
  }

  protected getSubgraphURL(chainId: ChainsIds): string {
    return this.settings.dexes?.[chainId]?.[DexProtocolName.UNISWAP_V3]?.subgraphUrl || '';
  }

  protected async getPoolsWithQuote(
    params: UniswapV3FetcherInputParams[],
  ): Promise<PoolWithQuote[]> {
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
