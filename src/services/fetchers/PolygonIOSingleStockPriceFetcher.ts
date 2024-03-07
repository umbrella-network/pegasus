import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {BasePolygonIOSingleFetcher, SinglePriceResponse} from './BasePolygonIOSingleFetcher.js';

@injectable()
class PolygonIOSingleStockPriceFetcher extends BasePolygonIOSingleFetcher {
  constructor(@inject('Settings') settings: Settings) {
    super();
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.last.price';
  }

  async apply({sym}: {sym: string}, raw = false): Promise<SinglePriceResponse | number> {
    const sourceUrl = `https://api.polygon.io/v1/last/stocks/${sym}?apiKey=${this.apiKey}`;
    return this.fetch(sourceUrl, raw);
  }
}

export default PolygonIOSingleStockPriceFetcher;
