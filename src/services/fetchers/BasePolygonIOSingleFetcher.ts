import {injectable} from 'inversify';
import {BasePolygonIOFetcher} from './BasePolygonIOFetcher.js';

export interface SinglePriceResponse {
  symbol: string;
  last: {
    price: number;
    timestamp: number;
  };
}

@injectable()
export abstract class BasePolygonIOSingleFetcher extends BasePolygonIOFetcher {
  protected async fetch(sourceUrl: string, raw = false): Promise<SinglePriceResponse | number> {
    const responseData = await this.fetchRaw(sourceUrl);
    return raw ? (responseData as SinglePriceResponse) : (this.extractValues(responseData, this.valuePath) as number);
  }
}
