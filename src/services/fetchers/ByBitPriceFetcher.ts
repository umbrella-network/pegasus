import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherResult,
  FetcherName,
  FetchedValueType,
} from '../../types/fetchers.js';

import {ByBitDataRepository} from '../../repositories/fetchers/ByBitDataRepository.js';

export interface ByBitPriceInputParams {
  symbol: string;
}

@injectable()
export class ByBitPriceFetcher implements FeedFetcherInterface {
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(ByBitDataRepository) byBitDataRepository!: ByBitDataRepository;
  @inject('Logger') protected logger!: Logger;

  private timeout: number;
  private logPrefix = `[${FetcherName.ByBitPrice}]`;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.byBit.timeout;
  }

  async apply(inputs: ByBitPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    const prices = await this.byBitDataRepository.getPrices(inputs, options.timestamp);
    const fetcherResult = {prices, timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.ByBitPrice,
      FetchedValueType.Price,
      ByBitPriceFetcher.fetcherSource,
    );

    return fetcherResult;
  }
}
