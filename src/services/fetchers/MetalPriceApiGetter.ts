import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetchedValueType,
  FetcherName,
  FetcherResult,
} from '../../types/fetchers.js';

import {MetalPriceApiDataRepository} from '../../repositories/fetchers/MetalPriceApiDataRepository.js';
import TimeService from '../TimeService.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';
import {DeviationFeedsGetter} from "../../workers/fetchers/_common/DeviationFeedsGetter";

export interface MetalPriceApiInputParams {
  symbol: string;
  currency: string;
}

@injectable()
export class MetalPriceApiGetter implements FeedFetcherInterface {
  @inject(DeviationFeedsGetter) feedsGetter!: DeviationFeedsGetter;
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(MetalPriceApiDataRepository) private metalPriceApiDataRepository!: MetalPriceApiDataRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.MetalPriceApi}]`;
  static fetcherSource = '';

  async apply(params: MetalPriceApiInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    const [price] = await this.metalPriceApiDataRepository.getPrices(params, options.timestamp);
    const result = {prices: [price], timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      result,
      options.symbols,
      FetcherName.MetalPriceApi,
      FetchedValueType.Price,
      MetalPriceApiGetter.fetcherSource,
    );

    return result;
  }
}
