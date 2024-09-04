import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {
  FetcherName,
  FeedFetcherOptions,
  FeedFetcherInterface,
  FetcherResult,
  FetchedValueType,
} from '../../types/fetchers.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import {PolygonIOCurrencySnapshotGramsDataRepository} from '../../repositories/fetchers/PolygonIOCurrencySnapshotGramsDataRepository.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';
import TimeService from '../TimeService.js';

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
export class PolygonIOCurrencySnapshotGramsFetcher implements FeedFetcherInterface {
  @inject('Logger') protected logger!: Logger;
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject(PolygonIOCurrencySnapshotGramsDataRepository)
  private pIOCurrencySnapshotGramsDataRepository!: PolygonIOCurrencySnapshotGramsDataRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;

  static fetcherSource = '';
  private logPrefix = `[${FetcherName.PolygonIOCurrencySnapshotGrams}]`;

  async apply(
    params: PolygonIOCurrencySnapshotGramsInputParams[],
    options: FeedFetcherOptions,
  ): Promise<FetcherResult> {
    try {
      await this.cacheInput(params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }

    const {symbols, timestamp} = options;

    const prices = await this.pIOCurrencySnapshotGramsDataRepository.getPrices(params, timestamp);

    await this.priceDataRepository.saveFetcherResults(
      {prices, timestamp},
      symbols,
      FetcherName.PolygonIOCurrencySnapshotGrams,
      FetchedValueType.Price,
      PolygonIOCurrencySnapshotGramsFetcher.fetcherSource,
    );

    return {prices};
  }

  private async cacheInput(params: PolygonIOCurrencySnapshotGramsInputParams[]): Promise<void> {
    const timestamp = this.timeService.apply();
    const key = `${FetcherName.PolygonIOCurrencySnapshotGrams}_cachedParams`;

    const cache = await this.mappingRepository.get(key);
    const cachedParams = JSON.parse(cache || '{}');

    params.forEach((input) => {
      cachedParams[input.ticker.toLowerCase()] = timestamp;
    });

    await this.mappingRepository.set(key, JSON.stringify(cachedParams));
  }
}
