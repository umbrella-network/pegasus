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
import {
  PolygonIOStockSnapshotDataRepository
} from '../../repositories/fetchers/PolygonIOStockSnapshotDataRepository.js';

export interface PolygonIOStockSnapshotFetcherInputParams {
  ticker: string;
}

@injectable()
export class PolygonIOStockSnapshotPriceGetter implements FeedFetcherInterface {
  @inject('Logger') protected logger!: Logger;

  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(PolygonIOStockSnapshotDataRepository)
  polygonIOStockSnapshotDataRepository!: PolygonIOStockSnapshotDataRepository;

  private logPrefix = `[${FetcherName.PolygonIOStockSnapshotPrice}]`;

  async apply(params: PolygonIOStockSnapshotFetcherInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    const prices = await this.polygonIOStockSnapshotDataRepository.getPrices(params, options.timestamp);

    const fetcherResults: FetcherResult = {prices, timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResults,
      options.symbols,
      FetcherName.PolygonIOStockSnapshotPrice,
      FetchedValueType.Price,
    );

    return fetcherResults;
  }
}
