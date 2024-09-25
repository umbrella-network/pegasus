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

    const key = FetchersMappingCacheKeys.MOC_MEASUREMENT_MEASUREMENT_ID;

    const cache = await this.mappingRepository.get(key);
    const idsCache = JSON.parse(cache || '{}');

    inputsParams.forEach((input) => {
      idsCache[input.measurement_id] = timestamp;
    });

    inputsParams.forEach((input) => {
      currenciesCache[input.currency.toLowerCase()] = timestamp;
    });

    await this.mappingRepository.setMany([
      {_id: idKey, value: JSON.stringify(idsCache)},
      {_id: currenciesKey, value: JSON.stringify(currenciesCache)},
    ]);
  }
}
