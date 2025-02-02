import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetchedValueType,
  FetcherName,
  FetcherResult,
} from '../../types/fetchers.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import {MetalsDevApiDataRepository} from '../../repositories/fetchers/MetalsDevApiDataRepository.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';
import {FetchersMappingCacheKeys} from './common/FetchersMappingCacheKeys.js';

export interface MetalsDevApiPriceInputParams {
  metal: string;
  currency: string;
}

@injectable()
export class MetalsDevApiGetter implements FeedFetcherInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(MetalsDevApiDataRepository) private metalsDevApiDataRepository!: MetalsDevApiDataRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.MetalsDevApi}]`;
  static fetcherSource = '';

  async apply(params: MetalsDevApiPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    try {
      await this.cacheInput(params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed cache: ${(e as Error).message}`);
    }

    const [price] = await this.metalsDevApiDataRepository.getPrices(params, options.timestamp);
    const result = {prices: [price], timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      result,
      options.symbols,
      FetcherName.MetalsDevApi,
      FetchedValueType.Price,
      MetalsDevApiGetter.fetcherSource,
    );

    return result;
  }

  private async cacheInput(params: MetalsDevApiPriceInputParams[]): Promise<void> {
    const timestamp = this.timeService.apply();
    const key = FetchersMappingCacheKeys.METALS_DEV_API_PARAMS;

    // const cache = await this.mappingRepository.get(key);
    // const cachedParams = JSON.parse(cache || '{}');
    const cachedParams: Record<string, number> = {};

    params.forEach((input) => {
      cachedParams[`${input.metal};${input.currency}`.toLowerCase()] = timestamp;
    });

    await this.mappingRepository.set(key, JSON.stringify(cachedParams));
  }
}
