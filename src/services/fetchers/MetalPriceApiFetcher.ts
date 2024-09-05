import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherName,
  FetcherResult,
  FetchedValueType,
} from '../../types/fetchers.js';

import {MetalPriceApiDataRepository} from '../../repositories/fetchers/MetalPriceApiDataRepository.js';
import TimeService from '../TimeService.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';
import {FetchersMappingCacheKeys} from './common/FetchersMappingCacheKeys.js';

export interface MetalPriceApiInputParams {
  symbol: string;
  currency: string;
}

@injectable()
export class MetalPriceApiFetcher implements FeedFetcherInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(MetalPriceApiDataRepository) private metalPriceApiDataRepository!: MetalPriceApiDataRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.MetalPriceApi}]`;
  static fetcherSource = '';

  async apply(params: MetalPriceApiInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    try {
      await this.cacheInput(params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed cache: ${(e as Error).message}`);
    }

    const [price] = await this.metalPriceApiDataRepository.getPrices(params, options.timestamp);
    const result = {prices: [price], timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      result,
      options.symbols,
      FetcherName.MetalPriceApi,
      FetchedValueType.Price,
      MetalPriceApiFetcher.fetcherSource,
    );

    return result;
  }

  private async cacheInput(params: MetalPriceApiInputParams[]): Promise<void> {
    const timestamp = this.timeService.apply();
    const key = FetchersMappingCacheKeys.METAL_PRICE_API_PARAMS;

    // const cache = await this.mappingRepository.get(key);
    // const cachedParams = JSON.parse(cache || '{}');
    const cachedParams: Record<string, number> = {};

    params.forEach((input) => {
      cachedParams[`${input.symbol};${input.currency}`.toLowerCase()] = timestamp;
    });

    await this.mappingRepository.set(key, JSON.stringify(cachedParams));
  }
}
