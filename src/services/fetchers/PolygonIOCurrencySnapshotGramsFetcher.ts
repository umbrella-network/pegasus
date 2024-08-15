import {inject, injectable} from 'inversify';

import {
  FetcherName,
  FeedFetcherOptions,
  FeedFetcherInterface,
  FetcherResult,
  FetchedValueType,
} from '../../types/fetchers.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import Settings from '../../types/Settings.js';
import {PolygonIOCurrencySnapshotGramsDataRepository} from '../../repositories/fetchers/PolygonIOCurrencySnapshotGramsDataRepository.js';
import {BasePolygonIOSnapshotFetcher, SnapshotResponse} from './common/BasePolygonIOSnapshotFetcher.js';

export interface PolygonIOCurrencySnapshotGramsInputParams {
  ticker: string;
}

type ParsedResponse = {ticker: string; price: number; timestamp: number};

/*
    - fetcher:
        name: PolygonIOCurrencySnapshotGrams
        params:
          ticker: C:XAUUSD
 */
@injectable()
export class PolygonIOCurrencySnapshotGramsFetcher
  extends BasePolygonIOSnapshotFetcher
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

  async apply(
    params: PolygonIOCurrencySnapshotGramsInputParams[],
    options: FeedFetcherOptions,
  ): Promise<FetcherResult> {
    if (params.length != 1) throw new Error(`${this.logPrefix} not a multifetcher: ${params}`);

    const {ticker} = params[0];
    const {symbols, timestamp} = options;

    const baseUrl = 'https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers';
    // const url = `${baseUrl}/${ticker}?apiKey=${this.apiKey}`;
    const url = `${baseUrl}?apiKey=${this.apiKey}`;

    this.logger.debug(`${this.logPrefix} call for ${ticker}`);

    const response = <SnapshotResponse>await this.fetch(url, true);
    const parsed = this.parseResponse(response, params[0]);

    if (!parsed) return {prices: []};
    await this.savePrices(parsed);

    const prices = await this.pIOCurrencySnapshotGramsDataRepository.getPrices(params, timestamp);

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
    response: SnapshotResponse,
    params: PolygonIOCurrencySnapshotGramsInputParams,
  ): ParsedResponse[] {
    if (response.error) {
      this.logger.error(`${this.logPrefix} [${response.status}]: ${response.error} for ${params.ticker}`);
      return [];
    }

    return response.tickers
      .map((ticker, ix) => {
        const oneOzInGrams = 31.1034; // grams
        const price = (ticker.lastQuote.a as number) / oneOzInGrams;

        if (isNaN(price)) {
          this.logger.error(`${this.logPrefix}#${ix} price fail for ${params.ticker}. Computed value gave NaN.`);
          return;
        }

        this.logger.debug(`${this.logPrefix}#${ix} price for ${params.ticker} (${ticker.ticker}): ${price}`);
        return {price, ticker: ticker.ticker, timestamp: ticker.lastQuote.t / 1e3};
      })
      .filter((d) => d !== undefined) as ParsedResponse[];
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
