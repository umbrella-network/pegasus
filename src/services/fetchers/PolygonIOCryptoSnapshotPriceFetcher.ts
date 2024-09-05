import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetchedValueType,
  FetcherName,
  FetcherResult,
} from '../../types/fetchers.js';

import {PolygonIOCryptoSnapshotDataRepository} from '../../repositories/fetchers/PolygonIOCryptoSnapshotDataRepository.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';

export interface PolygonIOCryptoSnapshotInputParams {
  symbol: string;
  fsym?: string; // TODO backwards compatible, to remove
  tsym?: string; // TODO backwards compatible, to remove
}

@injectable()
export class PolygonIOCryptoSnapshotPriceFetcher implements FeedFetcherInterface {
  @inject('Logger') protected logger!: Logger;
  @inject(PolygonIOCryptoSnapshotDataRepository)
  pIOCryptoSnapshotDataRepository!: PolygonIOCryptoSnapshotDataRepository;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;

  private logPrefix = `[${FetcherName.PolygonIOCryptoSnapshotPrice}]`;

  async apply(params: PolygonIOCryptoSnapshotInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    const prices = await this.pIOCryptoSnapshotDataRepository.getPrices(
      this.backwardsCompatibleParams(params),
      options.timestamp,
    );

    const fetcherResults: FetcherResult = {prices, timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResults,
      options.symbols,
      FetcherName.PolygonIOCryptoSnapshotPrice,
      FetchedValueType.Price,
    );

    return fetcherResults;
  }

  private backwardsCompatibleParams(
    params: PolygonIOCryptoSnapshotInputParams[],
  ): PolygonIOCryptoSnapshotInputParams[] {
    return params.map((p) => {
      if (p.symbol) return p;

      return {
        symbol: `X:${p.fsym}${p.tsym}`,
      };
    });
  }
}
