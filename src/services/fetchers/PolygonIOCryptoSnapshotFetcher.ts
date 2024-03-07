import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {BasePolygonIOSnapshotFetcher, SnapshotResponse} from './BasePolygonIOSnapshotFetcher.js';

@injectable()
class PolygonIOCryptoSnapshotFetcher extends BasePolygonIOSnapshotFetcher {
  constructor(@inject('Settings') settings: Settings) {
    super();

    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.tickers[*].lastTrade.p';
  }

  async apply({symbols}: {symbols: string[]}, raw = false): Promise<SnapshotResponse | number[]> {
    const sourceUrl = `https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers?tickers=${symbols.join(
      ',',
    )}&apiKey=${this.apiKey}`;

    return this.fetch(sourceUrl, raw);
  }
}

export default PolygonIOCryptoSnapshotFetcher;
