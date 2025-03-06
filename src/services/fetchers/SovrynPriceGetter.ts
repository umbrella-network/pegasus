import {inject, injectable} from 'inversify';
import {ethers} from 'ethers';
import {Logger} from 'winston';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FeedPrice,
  FetchedValueType,
  FetcherName,
  FetcherResult,
} from '../../types/fetchers.js';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import {SovrynDataRepository} from '../../repositories/fetchers/SovrynDataRepository.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';
import TimeService from '../TimeService.js';
import {FetchersMappingCacheKeys} from './common/FetchersMappingCacheKeys.js';

export type SovrynPriceInputParams = {
  base: string;
  quote: string;
  amountInDecimals: number;
};

/*
For getting the prices of different of a Sovryn pool the `base` (input token)
and `quote` (output token), and the `amount` of the input token should be provided.

weBTC-rUSDT:
  inputs:
    - fetcher:
        name: SovrynPriceFetcher
        params:
          base: '0x69fe5cec81d5ef92600c1a0db1f11986ab3758ab'
          quote: '0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0'
          amountIdDecimals: 18
*/
@injectable()
export class SovrynPriceGetter implements FeedFetcherInterface {
  @inject(SovrynDataRepository) private sovrynDataRepository!: SovrynDataRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject('Logger') private logger!: Logger;
  @inject(TimeService) private timeService!: TimeService;

  private logPrefix = `[${FetcherName.SovrynPrice}]`;
  static fetcherSource = '';

  public async apply(params: SovrynPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    this.logger.debug(
      `${this.logPrefix} fetcher started for ${params.map((p) => `[${p.base}/${p.quote}]`).join(', ')}`,
    );

    const pricesResponse: FeedPrice[] = await this.sovrynDataRepository.getPrices(params, options.timestamp);

    const fetcherResult = {prices: pricesResponse, timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.SovrynPrice,
      FetchedValueType.Price,
      SovrynPriceGetter.fetcherSource,
    );

    return fetcherResult;
  }
}
