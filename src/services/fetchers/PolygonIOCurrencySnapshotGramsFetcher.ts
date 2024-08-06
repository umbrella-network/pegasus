import {inject, injectable} from 'inversify';

import {
  FetcherName,
  FeedFetcherOptions,
  FeedFetcherInterface,
  FetcherResult,
  FetchedValueType,
} from '../../types/fetchers.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import {BasePolygonIOSingleFetcher} from './BasePolygonIOSingleFetcher.js';
import Settings from '../../types/Settings.js';

/*
    - fetcher:
        name: PolygonIOCurrencySnapshot
        params:
          ticker: C:XAUUSD
 */

export interface PolygonIOCurrencySnapshotGramsInputParams {
  ticker: string;
}

@injectable()
export default class PolygonIOCurrencySnapshotGramsFetcher
  extends BasePolygonIOSingleFetcher
  implements FeedFetcherInterface
{
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;

  private logPrefix = `[${FetcherName.PolygonIOCurrencySnapshotGrams}]`;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    super();
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.ticker.lastQuote.a';
  }

  async apply(params: PolygonIOCurrencySnapshotGramsInputParams, options: FeedFetcherOptions): Promise<FetcherResult> {
    const {ticker} = params;
    const {symbols, timestamp} = options;

    const baseUrl = 'https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers';
    const url = `${baseUrl}/${ticker}?apiKey=${this.apiKey}`;

    if (!timestamp || timestamp <= 0) throw new Error(`${this.logPrefix} invalid timestamp value: ${timestamp}`);

    this.logger.debug(`${this.logPrefix} call for ${ticker}`);

    const data = await this.fetch(url);
    const oneOzInGrams = 31.1034; // grams
    const price = (data as number) / oneOzInGrams;

    if (isNaN(price)) {
      this.logger.error(`${this.logPrefix} couldn't compute price for ${baseUrl}/${ticker}. Computed value gave NaN.`);
      return {prices: []};
    }

    await this.priceDataRepository.saveFetcherResults(
      {prices: [price]},
      symbols,
      FetcherName.PolygonIOCurrencySnapshotGrams,
      FetchedValueType.Price,
      PolygonIOCurrencySnapshotGramsFetcher.fetcherSource,
    );

    return {prices: [price]};
  }
}
