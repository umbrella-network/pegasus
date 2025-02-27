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
import {UniswapV3CandlestickFetcherFromChain} from "./UniswapV3CandlestickFetcherFromChain";

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
  @inject(UniswapV3CandlestickFetcherFromChain) candlestickFetcher!: UniswapV3CandlestickFetcherFromChain;

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
    // Step 1: Group params based on `fromChain`
    const groupedParams: Record<string, UniswapV3FetcherInputParams[]> = {};

    params.forEach((param) => {
      if (!groupedParams[param.fromChain]) {
        groupedParams[param.fromChain] = [];
      }
      groupedParams[param.fromChain].push(param);
    });

    // Step 2: Fetch candlestick data for each `fromChain` group using `this.candlestickFetcher.apply`
    const resultsByChain: Record<string, (CandlestickModel | undefined)[]> = {};
    const fromChains = Object.keys(groupedParams);

    for (const fromChain of fromChains) {
      // Ensure `fromChain` is used as the `chainId` for the `apply` method
      resultsByChain[fromChain] = await this.candlestickFetcher.apply(
        fromChain as ChainsIds,  // `fromChain` is passed as `chainId`
        groupedParams[fromChain], // Grouped params for this chain
        timestamp                 // Pass timestamp
      );
    }

    // Step 3: Rearrange results to match the original `params` order
    const result: (CandlestickModel | undefined)[] = params.map((param) => {
      // Match the original index based on `fromChain` group and param order
      const chainResults = resultsByChain[param.fromChain];
      const index = groupedParams[param.fromChain].indexOf(param);
      return chainResults ? chainResults[index] : undefined;
    });

    return result;
  }
}
