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

import {CoingeckoDataRepository} from '../../repositories/fetchers/CoingeckoDataRepository.js';

import {MappingRepository} from '../../repositories/MappingRepository.js';

export interface CoingeckoPriceInputParams {
  id: string;
  currency: string;
}

@injectable()
export class CoingeckoPriceGetter implements FeedFetcherInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(CoingeckoDataRepository) private coingeckoDataRepository!: CoingeckoDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.CoingeckoPrice}]`;
  static fetcherSource = '';

  async apply(params: CoingeckoPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    const prices = await this.coingeckoDataRepository.getPrices(params, options.timestamp);
    const fetcherResult = {prices, timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.CoingeckoPrice,
      FetchedValueType.Price,
      CoingeckoPriceGetter.fetcherSource,
    );

    return fetcherResult;
  }
}
