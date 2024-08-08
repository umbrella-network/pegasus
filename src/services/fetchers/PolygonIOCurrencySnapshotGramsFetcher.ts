import {inject, injectable} from 'inversify';

import {
  FetcherName,
  FeedFetcherOptions,
  FeedFetcherInterface,
  FetcherResult,
  FetchedValueType,
} from '../../types/fetchers.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import {BasePolygonIOSingleFetcher, SinglePriceResponse} from './common/BasePolygonIOSingleFetcher.js';
import Settings from '../../types/Settings.js';
import {PolygonIOCurrencySnapshotGramsDataRepository} from '../../repositories/fetchers/PolygonIOCurrencySnapshotGramsDataRepository.js';

/*
    - fetcher:
        name: PolygonIOCurrencySnapshot
        params:
          ticker: C:XAUUSD
 */

export interface PolygonIOCurrencySnapshotGramsInputParams {
  ticker: string;
}

type ParsedResponse = {ticker: string; price: number; timestamp: number};

@injectable()
export default class PolygonIOCurrencySnapshotGramsFetcher
  extends BasePolygonIOSingleFetcher
  implements FeedFetcherInterface
{
  @inject(PolygonIOCurrencySnapshotGramsDataRepository)
  private pIOCurrencySnapshotGramsDataRepository!: PolygonIOCurrencySnapshotGramsDataRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;

  private logPrefix = `[${FetcherName.PolygonIOCurrencySnapshotGramsPrice}]`;
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

    const response = <SinglePriceResponse>await this.fetch(url, true);
    const parsed = this.parseResponse(response, params);

    if (!parsed) return {prices: []};
    await this.savePrices([parsed]);

    const prices = await this.pIOCurrencySnapshotGramsDataRepository.getPrices([params], timestamp);

    await this.priceDataRepository.saveFetcherResults(
      {prices, timestamp},
      symbols,
      FetcherName.PolygonIOCurrencySnapshotGramsPrice,
      FetchedValueType.Price,
      PolygonIOCurrencySnapshotGramsFetcher.fetcherSource,
    );

    return {prices};
  }

  private parseResponse(
    response: SinglePriceResponse,
    params: PolygonIOCurrencySnapshotGramsInputParams,
  ): ParsedResponse | undefined {
    const oneOzInGrams = 31.1034; // grams
    const price = (response.last.price as number) / oneOzInGrams;

    if (isNaN(price)) {
      this.logger.error(`${this.logPrefix} price fail for ${params.ticker}. Computed value gave NaN.`);
      return;
    }

    return {price, ticker: response.symbol, timestamp: response.last.timestamp};
  }

  private async savePrices(parsed: ParsedResponse[]): Promise<void> {
    const allData = parsed.map((data) => {
      return {
        timestamp: data.timestamp,
        value: data.price,
        params: {
          ticker: data.ticker,
        },
      };
    });

    await this.pIOCurrencySnapshotGramsDataRepository.save(allData);
  }
}
