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

import {CoingeckoDataRepository} from '../../repositories/fetchers/CoingeckoDataRepository.js';

import {MappingRepository} from '../../repositories/MappingRepository.js';
import {FetchersMappingCacheKeys} from './common/FetchersMappingCacheKeys.js';

export interface CoingeckoPriceInputParams {
  id: string;
  currency: string;
}

@injectable()
export class CoingeckoPriceFetcher implements FeedFetcherInterface {
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

    try {
      await this.cacheInput(params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} cacheInput failed: ${(e as Error).message}`);
    }

    const prices = await this.coingeckoDataRepository.getPrices(params, options.timestamp);
    const fetcherResult = {prices, timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.CoingeckoPrice,
      FetchedValueType.Price,
      CoingeckoPriceFetcher.fetcherSource,
    );

    return fetcherResult;
  }

  private async cacheInput(inputsParams: CoingeckoPriceInputParams[]): Promise<void> {
    const timestamp = this.timeService.apply();

    const idKey = FetchersMappingCacheKeys.COINGECKO_PRICE_IDS;
    const currenciesKey = FetchersMappingCacheKeys.COINGECKO_PRICE_CURRENCIES;

    const cache = await this.mappingRepository.getMany([idKey, currenciesKey]);
    const idsCache = JSON.parse(cache[idKey] || '{}');
    const currenciesCache = JSON.parse(cache[currenciesKey] || '{}');

    inputsParams.forEach((input) => {
      idsCache[input.id.toLowerCase()] = timestamp;
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
