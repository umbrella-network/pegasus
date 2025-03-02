import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {ethers} from 'ethers';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetchedValueType,
  FetcherName,
  FetcherResult,
} from '../../types/fetchers.js';
import {UniswapV3PriceRepository} from '../../repositories/fetchers/UniswapV3PriceRepository.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';
import {FetchersMappingCacheKeys} from './common/FetchersMappingCacheKeys.js';
import {
  UniswapV2CandlestickInterval,
  UniswapV3CandlestickFetcher,
} from '../../workers/fetchers/dexes/uniswapV3/UniswapV3CandlestickFetcher.js';

export type UniswapV3FetcherInputParams = {
  fromChain: string;
  base: string;
  quote: string;
  amountInDecimals: number;
  vwapInterval?: UniswapV2CandlestickInterval;
};

@injectable()
export class UniswapV3Getter implements FeedFetcherInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(UniswapV3PriceRepository) protected uniswapV3PriceRepository!: UniswapV3PriceRepository;
  @inject(UniswapV3CandlestickFetcher) candlestickFetcher!: UniswapV3CandlestickFetcher;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') protected logger!: Logger;

  private logPrefix = `[${FetcherName.UniswapV3}]`;

  static fetcherSource = '';

  async apply(params: UniswapV3FetcherInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    try {
      await this.cacheInput(params);
    } catch (error) {
      this.logger.error(`${this.logPrefix} failed cache: ${error}`);
    }

    const prices = await this.uniswapV3PriceRepository.getPrices(params, options.timestamp);
    const candles = await this.candlestickFetcher.apply(params, options.timestamp);

    const fetcherResults: FetcherResult = {
      prices: prices.map((price, ix) => {
        const volume = candles[ix]?.value;

        return {
          value: price.value,
          vwapVolume: volume ? parseFloat(volume) : undefined,
        };
      }),
      timestamp: options.timestamp,
    };

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResults,
      options.symbols,
      FetcherName.UniswapV3,
      FetchedValueType.Price,
      UniswapV3Getter.fetcherSource,
    );

    return fetcherResults;
  }

  private async cacheInput(params: UniswapV3FetcherInputParams[]): Promise<void> {
    const timestamp = this.timeService.apply();
    const key = FetchersMappingCacheKeys.UNISWAPV3_PARAMS;

    const cache = await this.mappingRepository.get(key);
    const cachedParams = JSON.parse(cache || '{}');

    params.forEach((input) => {
      const id = ethers.utils.id(`${input.fromChain};${input.base};${input.quote}`.toLowerCase());

      cachedParams[id] = {
        params: <UniswapV3FetcherInputParams>{
          fromChain: input.fromChain,
          base: input.base.toLowerCase(),
          quote: input.quote.toLowerCase(),
          amountInDecimals: input.amountInDecimals,
        },
        timestamp,
      };
    });

    await this.mappingRepository.set(key, JSON.stringify(cachedParams));
  }
}
