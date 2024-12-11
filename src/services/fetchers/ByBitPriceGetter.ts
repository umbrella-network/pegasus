import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {KlineIntervalV3} from 'bybit-api';

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
import {BybitCandlestickFetcher} from '../../workers/fetchers/BybitCandlestickFetcher.js';

export type ByBitCategory = 'spot' | 'linear' | 'inverse';

export interface ByBitPriceInputParams {
  symbol: string;
  vwapInterval?: KlineIntervalV3;
  vwapCategory?: ByBitCategory;
}

@injectable()
export class ByBitPriceGetter implements FeedFetcherInterface {
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(BybitCandlestickFetcher) candlestickFetcher!: BybitCandlestickFetcher;
  @inject(ByBitDataRepository) byBitDataRepository!: ByBitDataRepository;
  @inject('Logger') protected logger!: Logger;

  private timeout: number;
  private logPrefix = `[${FetcherName.ByBitPrice}]`;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.byBit.timeout;
  }

  async apply(params: ByBitPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    const prices = await this.byBitDataRepository.getPrices(params, options.timestamp);
    const candles = await this.candlestickFetcher.apply(params, options.timestamp);
    this.logger.debug(`${this.logPrefix} candles ${JSON.stringify(candles)}`);

    const fetcherResults: FetcherResult = {
      prices: prices.map((price, ix) => {
        const volume = candles[ix]?.value;

        return {
          value: price.value,
          vwapVolume: volume ? parseFloat(volume) : undefined,
        };
      }),
      timestamp: options.timestamp,
    };

    this.logger.debug(`${this.logPrefix} fetcherResult ${JSON.stringify(fetcherResults)}`);

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResults,
      options.symbols,
      FetcherName.ByBitPrice,
      FetchedValueType.Price,
      ByBitPriceGetter.fetcherSource,
    );

    return fetcherResults;
  }
}
