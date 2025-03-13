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
import {PolygonIOCurrencySnapshotGramsDataRepository} from '../../repositories/fetchers/PolygonIOCurrencySnapshotGramsDataRepository.js';

export interface PolygonIOCurrencySnapshotGramsInputParams {
  ticker: string;
}

/*
    - fetcher:
        name: PolygonIOCurrencySnapshotGrams
        params:
          ticker: C:XAUUSD
 */
@injectable()
export class PolygonIOCurrencySnapshotGramsGetter implements FeedFetcherInterface {
  @inject('Logger') protected logger!: Logger;
  @inject(PolygonIOCurrencySnapshotGramsDataRepository)
  private pIOCurrencySnapshotGramsDataRepository!: PolygonIOCurrencySnapshotGramsDataRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;

  static fetcherSource = '';
  private logPrefix = `[${FetcherName.PolygonIOCurrencySnapshotGrams}]`;

  async apply(
    params: PolygonIOCurrencySnapshotGramsInputParams[],
    options: FeedFetcherOptions,
  ): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    const {symbols, timestamp} = options;

    const prices = await this.pIOCurrencySnapshotGramsDataRepository.getPrices(params, timestamp);

    await this.priceDataRepository.saveFetcherResults(
      {prices, timestamp},
      symbols,
      FetcherName.PolygonIOCurrencySnapshotGrams,
      FetchedValueType.Price,
      PolygonIOCurrencySnapshotGramsGetter.fetcherSource,
    );

    return {prices};
  }
}
