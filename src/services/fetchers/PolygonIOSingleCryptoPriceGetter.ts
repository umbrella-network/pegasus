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
import {PolygonIOSingleCryptoDataRepository} from '../../repositories/fetchers/PolygonIOSingleCryptoDataRepository.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';

export interface PolygonIOSingleCryptoPriceInputParams {
  fsym: string;
  tsym: string;
}

@injectable()
export class PolygonIOSingleCryptoPriceGetter implements FeedFetcherInterface {
  @inject('Logger') protected logger!: Logger;
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(PolygonIOSingleCryptoDataRepository) pIOSingleCryptoDataRepository!: PolygonIOSingleCryptoDataRepository;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;

  private logPrefix = `[${FetcherName.PolygonIOSingleCryptoPrice}]`;

  async apply(params: PolygonIOSingleCryptoPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    const prices = await this.pIOSingleCryptoDataRepository.getPrices(params, options.timestamp);
    const fetcherResults: FetcherResult = {prices, timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResults,
      options.symbols,
      FetcherName.PolygonIOSingleCryptoPrice,
      FetchedValueType.Price,
    );

    return fetcherResults;
  }
}
