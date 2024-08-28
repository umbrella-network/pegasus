import {injectable} from 'inversify';
import {BasePolygonIOFetcher} from './BasePolygonIOFetcher.js';

export interface SinglePriceResponse {
  symbol: string;
  status: 'success' | 'error';
  last: {
    price: number;
    timestamp: number;
  };
}

@injectable()
export abstract class BasePolygonIOSingleFetcher extends BasePolygonIOFetcher {
  protected async fetch(sourceUrl: string, raw = false): Promise<SinglePriceResponse | number> {
    const responseData = await this.fetchRaw(sourceUrl);

    const [extractedData] = raw
      ? ([responseData] as [SinglePriceResponse])
      : this.extractValues(responseData, this.valuePath);

    if (!extractedData) throw new Error('[BasePolygonIOSingleFetcher] empty data');

    return extractedData;
  }
}
