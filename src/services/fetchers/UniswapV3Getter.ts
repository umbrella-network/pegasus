import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {ethers} from 'ethers';

import {DexProtocolName} from '../../types/Dexes.js';
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

export type UniswapV3FetcherInputParams = {
  fromChain: string;
  base: string;
  quote: string;
  amountInDecimals: number;
};

@injectable()
export class UniswapV3Getter implements FeedFetcherInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(UniswapV3PriceRepository) protected uniswapV3PriceRepository!: UniswapV3PriceRepository;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') protected logger!: Logger;

  private logPrefix = `[${FetcherName.UniswapV3}]`;

  readonly dexProtocol = DexProtocolName.UNISWAP_V3;
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
    const fetcherResult = {prices, timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.UniswapV3,
      FetchedValueType.Price,
      UniswapV3Getter.fetcherSource,
    );

    return fetcherResult;
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
