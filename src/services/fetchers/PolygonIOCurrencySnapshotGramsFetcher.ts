import {inject, injectable} from 'inversify';

import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import {BasePolygonIOSingleFetcher} from './BasePolygonIOSingleFetcher.js';
import {FetcherName, FeedFetcherOptions, FeedFetcherInterface} from '../../types/fetchers.js';
import Settings from '../../types/Settings.js';

/*
    - fetcher:
        name: PolygonIOCurrencySnapshot
        params:
          ticker: C:XAUUSD
 */
@injectable()
class PolygonIOCurrencySnapshotGramsFetcher extends BasePolygonIOSingleFetcher implements FeedFetcherInterface {
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;

  private logPrefix = `[${FetcherName.POLYGON_IO_CURRENCY_SNAPSHOT_GRAMS}]`;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    super();
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.ticker.lastQuote.a';
  }

  async apply(params: {ticker: string}, options: FeedFetcherOptions): Promise<number> {
    const {ticker} = params;
    const {base: feedBase, quote: feedQuote, timestamp} = options;

    const baseUrl = 'https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers';
    const url = `${baseUrl}/${ticker}?apiKey=${this.apiKey}`;

    if (!timestamp || timestamp <= 0) throw new Error(`${this.logPrefix} invalid timestamp value: ${timestamp}`);

    this.logger.debug(`${this.logPrefix} call for ${ticker}`);

    const data = await this.fetch(url);
    const oneOzInGrams = 31.1034; // grams
    const price = (data as number) / oneOzInGrams;

    if (!isNaN(price)) {
      const payload: PriceDataPayload = {
        fetcher: FetcherName.POLYGON_IO_CRYPTO_PRICE,
        value: price.toString(),
        valueType: PriceValueType.Price,
        timestamp,
        feedBase,
        feedQuote,
        fetcherSource: PolygonIOCurrencySnapshotGramsFetcher.fetcherSource,
      };

      await this.priceDataRepository.savePrice(payload);

      return price;
    }

    return price;
  }
}

export default PolygonIOCurrencySnapshotGramsFetcher;
