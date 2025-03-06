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
import {MetalsDevApiDataRepository} from '../../repositories/fetchers/MetalsDevApiDataRepository.js';

export interface MetalsDevApiPriceInputParams {
  metal: string;
  currency: string;
}

@injectable()
export class MetalsDevApiGetter implements FeedFetcherInterface {
  @inject(MetalsDevApiDataRepository) private metalsDevApiDataRepository!: MetalsDevApiDataRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.MetalsDevApi}]`;
  static fetcherSource = '';

  async apply(params: MetalsDevApiPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    const [price] = await this.metalsDevApiDataRepository.getPrices(params, options.timestamp);
    const result = {prices: [price], timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      result,
      options.symbols,
      FetcherName.MetalsDevApi,
      FetchedValueType.Price,
      MetalsDevApiGetter.fetcherSource,
    );

    return result;
  }
}
