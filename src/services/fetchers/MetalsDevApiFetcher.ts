import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherName,
  FetcherResult,
  FetchedValueType,
} from '../../types/fetchers.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import {MetalsDevApiDataRepository} from '../../repositories/fetchers/MetalsDevApiDataRepository.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';

export interface MetalsDevApiPriceInputParams {
  metal: string;
  currency: string;
}

@injectable()
export class MetalsDevApiFetcher implements FeedFetcherInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(MetalsDevApiDataRepository) private metalsDevApiDataRepository!: MetalsDevApiDataRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.MetalsDevApi}]`;
  static fetcherSource = '';

  async apply(params: MetalsDevApiPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    try {
      await this.cacheInput(params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }

    const {symbols} = options;

    const [price] = await this.metalsDevApiDataRepository.getPrices(params, options.timestamp);
    const result = {prices: [price], timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      result,
      symbols,
      FetcherName.MetalsDevApi,
      FetchedValueType.Price,
      MetalsDevApiFetcher.fetcherSource,
    );

    return result;
  }

  private async cacheInput(params: MetalsDevApiPriceInputParams[]): Promise<void> {
    const timestamp = this.timeService.apply();
    const key = `${FetcherName.MetalsDevApi}_cachedParams`;

    // const cache = await this.mappingRepository.get(key);
    // const cachedParams = JSON.parse(cache || '{}');
    const cachedParams: Record<string, number> = {};

    params.forEach((input) => {
      cachedParams[`${input.metal};${input.currency}`.toLowerCase()] = timestamp;
    });

    await this.mappingRepository.set(key, JSON.stringify(cachedParams));
  }
}
