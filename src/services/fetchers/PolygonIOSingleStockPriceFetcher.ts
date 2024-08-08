import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {BasePolygonIOSingleFetcher, SinglePriceResponse} from './common/BasePolygonIOSingleFetcher.js';
import {FetcherName} from '../../types/fetchers.js';

@injectable()
export class PolygonIOSingleStockPriceFetcher extends BasePolygonIOSingleFetcher {
  private logPrefix = `[${FetcherName.PolygonIOStockPrice}] (single)`;

  constructor(@inject('Settings') settings: Settings) {
    super();
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.last.price';
  }

  async apply({sym}: {sym: string}, raw = false): Promise<SinglePriceResponse | number> {
    this.logger.debug(`${this.logPrefix} call for ${sym}`);

    const sourceUrl = `https://api.polygon.io/v1/last/stocks/${sym}?apiKey=${this.apiKey}`;
    return this.fetch(sourceUrl, raw);
  }
}
