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

import {MoCMeasurementDataRepository} from '../../repositories/fetchers/MoCMeasurementDataRepository.js';

export interface MoCMeasurementPriceInputParams {
  measurement_id: string;
  field: string;
}

@injectable()
export class MoCMeasurementGetter implements FeedFetcherInterface {
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(MoCMeasurementDataRepository) private moCMeasurementDataRepository!: MoCMeasurementDataRepository;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.MoCMeasurement}]`;

  async apply(params: MoCMeasurementPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
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
}
