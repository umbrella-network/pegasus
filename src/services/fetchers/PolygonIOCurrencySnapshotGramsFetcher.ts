import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {BasePolygonIOSingleFetcher} from './BasePolygonIOSingleFetcher.js';

type PolygonIOCurrencySnapshotGramsFetcherParams = {
  ticker: string;
};

/*
    - fetcher:
        name: PolygonIOCurrencySnapshot
        params:
          ticker: C:XAUUSD
 */
@injectable()
class PolygonIOCurrencySnapshotGramsFetcher extends BasePolygonIOSingleFetcher {
  constructor(@inject('Settings') settings: Settings) {
    super();
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.ticker.lastQuote.a';
  }

  async apply({ticker}: PolygonIOCurrencySnapshotGramsFetcherParams): Promise<number> {
    const sourceUrl = `https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers/${ticker}?apiKey=${this.apiKey}`;
    const data = await this.fetch(sourceUrl);
    const oneOzInGrams = 31.1034; // grams
    return (data as number) / oneOzInGrams;
  }
}

export default PolygonIOCurrencySnapshotGramsFetcher;
