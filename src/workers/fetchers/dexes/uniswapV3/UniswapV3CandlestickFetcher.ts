import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../../../types/Settings.js';
import TimeService from '../../../../services/TimeService.js';
import {CandlestickRepository} from '../../../../repositories/fetchers/CandlestickRepository.js';
import {CandlestickModel} from '../../../../models/fetchers/CandlestickModel.js';
import {UniswapV3FetcherInputParams} from '../../../../services/fetchers/UniswapV3Getter.js';
import {UniswapV3PoolRepository} from '../../../../repositories/UniswapV3PoolRepository.js';
import {GraphClient} from '../../../../services/graph/GraphClient';
import {ChainsIds} from '../../../../types/ChainsIds';
import {UniswapV3CandlestickFetcherFromChain} from './UniswapV3CandlestickFetcherFromChain.js';

export type UniswapV2CandlestickInterval = '1day';

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
    const chainToIndex: Record<string, number> = {};

    params.forEach((param) => {
      if (!groupedParams[param.fromChain]) {
        groupedParams[param.fromChain] = [];
      }

      groupedParams[param.fromChain].push(param);
      chainToIndex[param.fromChain] = groupedParams[param.fromChain].length - 1;
    });

    // Step 2: Fetch candlestick data for each `fromChain` group using `this.candlestickFetcher.apply`
    const resultsByChain: Record<string, (CandlestickModel | undefined)[]> = {};
    const fromChains = Object.keys(groupedParams);

    const resultsByChainPending = await Promise.all(
      fromChains.map((fromChain) => {
        return Promise.all([
          this.candlestickFetcher.apply(
            fromChain as ChainsIds, // `fromChain` is passed as `chainId`
            groupedParams[fromChain], // Grouped params for this chain
            timestamp, // Pass timestamp
          ),
          fromChain,
        ]);
      }),
    );

    resultsByChainPending.forEach(([candles, chainId]) => {
      if (resultsByChain[chainId] == undefined) {
        resultsByChain[chainId] = [];
      }

      resultsByChain[chainId] = candles;
    });

    const groupedParamsCounter: Record<string, number> = {};

    const result: (CandlestickModel | undefined)[] = [];

    params.forEach((p, i) => {
      const chainId = p.fromChain;

      if (groupedParamsCounter[chainId] == undefined) {
        groupedParamsCounter[chainId] = 0;
      }

      const ix = groupedParamsCounter[chainId];

      result.push(resultsByChain[chainId][ix]);

      groupedParamsCounter[chainId]++;
    });

    return result;
  }
}
