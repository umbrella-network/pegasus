import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {BasePolygonIOSingleFetcher} from './BasePolygonIOSingleFetcher.js';
import {FetcherName} from '../../types/fetchers.js';

/*
    - fetcher:
        name: PolygonIOCurrencySnapshot
        params:
          ticker: C:XAUUSD
 */
@injectable()
class PolygonIOCurrencySnapshotGramsFetcher extends BasePolygonIOSingleFetcher {
  private logPrefix = `[${FetcherName.POLYGON_IO_CURRENCY_SNAPSHOT_GRAMS}]`;

  constructor(@inject('Settings') settings: Settings) {
    super();
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.ticker.lastQuote.a';
  }

  async apply(params: {ticker: string}): Promise<number> {
    const {ticker} = params;
    const sourceUrl = `https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers/${ticker}?apiKey=${this.apiKey}`;

    this.logger.debug(`${this.logPrefix} call for ${ticker}`);

    const data = await this.fetch(sourceUrl);
    const oneOzInGrams = 31.1034; // grams
    return (data as number) / oneOzInGrams;
  }
}

export default PolygonIOCurrencySnapshotGramsFetcher;
