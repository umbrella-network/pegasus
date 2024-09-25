import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherResult,
  FetcherName,
  FetchedValueType,
} from '../../types/fetchers.js';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';

import {MoCMeasurementDataRepository} from '../../repositories/fetchers/MoCMeasurementDataRepository.js';

import {MappingRepository} from '../../repositories/MappingRepository.js';
import {FetchersMappingCacheKeys} from './common/FetchersMappingCacheKeys.js';
import {MoCMeasurementCache} from '../../types/fetchersCachedTypes';

export interface MoCMeasurementPriceInputParams {
  measurement_id: string;
  field: string;
}

@injectable()
export class MoCMeasurementGetter implements FeedFetcherInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(MoCMeasurementDataRepository) private moCMeasurementDataRepository!: MoCMeasurementDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.MoCMeasurement}]`;

  async apply(params: MoCMeasurementPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    try {
      await this.cacheInput(params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed cache: ${(e as Error).message}`);
    }

    const prices = await this.moCMeasurementDataRepository.getPrices(params, options.timestamp);
    const fetcherResult = {prices, timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.MoCMeasurement,
      FetchedValueType.Price,
      '',
    );

    return fetcherResult;
  }

  private async cacheInput(inputsParams: MoCMeasurementPriceInputParams[]): Promise<void> {
    const timestamp = this.timeService.apply();

    const key = FetchersMappingCacheKeys.MOC_MEASUREMENT_PARAMS;

    const cache = await this.mappingRepository.get(key);
    const idsCache = JSON.parse(cache || '{}') as MoCMeasurementCache;

    inputsParams.forEach((input) => {
      if (!idsCache[input.measurement_id]) idsCache[input.measurement_id] = [];

      idsCache[input.measurement_id].push(input.field);
    });

    await this.mappingRepository.set(key, JSON.stringify(idsCache));
  }
}
