import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {BasePolygonIOSingleFetcher, SinglePriceResponse} from './BasePolygonIOSingleFetcher.js';
import {FetcherName} from '../../types/fetchers.js';

@injectable()
class PolygonIOSingleCryptoPriceFetcher extends BasePolygonIOSingleFetcher {
  private logPrefix = `[${FetcherName.PolygonIOSingleCryptoPrice}]`;

  constructor(@inject('Settings') settings: Settings) {
    super();
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.last.price';
  }

  async apply({fsym, tsym}: {fsym: string; tsym: string}, raw = false): Promise<SinglePriceResponse | number> {
    this.logger.debug(`${this.logPrefix} call for ${fsym}-${tsym}`);

    const sourceUrl = `https://api.polygon.io/v1/last/crypto/${fsym}/${tsym}?apiKey=${this.apiKey}`;
    return this.fetch(sourceUrl, raw);
  }
}

export default PolygonIOSingleCryptoPriceFetcher;
