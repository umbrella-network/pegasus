import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {BasePolygonIOSingleFetcher} from './BasePolygonIOSingleFetcher.js';

@injectable()
class PolygonIOCurrencySnapshotFetcher extends BasePolygonIOSingleFetcher {
  constructor(@inject('Settings') settings: Settings) {
    super();
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.ticker.lastQuote.a';
  }

  async apply(ticker: string): Promise<number> {
    const sourceUrl = `https://api.polygon.io/v2/snapshot/locale/global/markets/forex/tickers/${ticker}?apiKey=${this.apiKey}`;

    const data = await this.fetch(sourceUrl);
    return data as number;
  }
}

export default PolygonIOCurrencySnapshotFetcher;
