import {inject, injectable} from 'inversify';

import Settings from '../../../types/Settings.js';
import {BasePolygonIOSingleFetcher, SinglePriceResponse} from './BasePolygonIOSingleFetcher.js';
import {FetcherName} from '../../../types/fetchers.js';

export interface PolygonIOSingleCryptoInputParams {
  fsym: string;
  tsym: string
}

// TODO we can make this separate fetcher, but for now it was only used to backup WS PolygonIOCryptoPriceService

@injectable()
export class PolygonIOSingleCryptoPriceFetcher extends BasePolygonIOSingleFetcher {
  private logPrefix = `[${FetcherName.PolygonIOSingleCryptoPrice}]`;

  constructor(@inject('Settings') settings: Settings) {
    super();
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.last.price';
  }

  async apply({fsym, tsym}: PolygonIOSingleCryptoInputParams, raw = false): Promise<SinglePriceResponse | number> {
    this.logger.debug(`${this.logPrefix} call for ${fsym}-${tsym}`);

    const sourceUrl = `https://api.polygon.io/v1/last/crypto/${fsym}/${tsym}?apiKey=${this.apiKey}`;
    return this.fetch(sourceUrl, raw);
  }
}
