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
import {GoldApiDataRepository} from '../../repositories/fetchers/GoldApiDataRepository.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';
import {FetchersMappingCacheKeys} from './common/FetchersMappingCacheKeys.js';

export interface GoldApiPriceInputParams {
  symbol: string;
  currency: string;
}

@injectable()
export class GoldApiPriceGetter implements FeedFetcherInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(GoldApiDataRepository) private goldApiDataRepository!: GoldApiDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.GoldApiPrice}]`;
  static fetcherSource = '';

  async apply(params: GoldApiPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    try {
      await this.cacheInput(params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed cache: ${(e as Error).message}`);
    }

    const prices = await this.goldApiDataRepository.getPrices(params, options.timestamp);

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      {prices, timestamp: options.timestamp},
      options.symbols,
      FetcherName.MetalsDevApi,
      FetchedValueType.Price,
      GoldApiPriceGetter.fetcherSource,
    );

    return {prices};
  }

  private async cacheInput(params: GoldApiPriceInputParams[]): Promise<void> {
    const timestamp = this.timeService.apply();
    const key = FetchersMappingCacheKeys.GOLD_API_PRICE_PARAMS;

    // const cache = await this.mappingRepository.get(key);
    // const cachedParams = JSON.parse(cache || '{}');
    const cachedParams: Record<string, number> = {};

    params.forEach((input) => {
      cachedParams[`${input.symbol};${input.currency}`.toLowerCase()] = timestamp;
    });

    await this.mappingRepository.set(key, JSON.stringify(cachedParams));
  }
}
