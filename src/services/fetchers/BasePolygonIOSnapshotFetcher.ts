import {injectable} from 'inversify';
import {BasePolygonIOFetcher} from './BasePolygonIOFetcher.js';

export interface Ticker {
  ticker: string;
  lastTrade: {
    p: number;
    t: number;
  };
}

export interface SnapshotResponse {
  tickers: Ticker[];
}

@injectable()
export abstract class BasePolygonIOSnapshotFetcher extends BasePolygonIOFetcher {
  protected async fetch(sourceUrl: string, raw = false): Promise<SnapshotResponse | number[]> {
    const responseData = await this.fetchRaw(sourceUrl);
    return raw ? (responseData as SnapshotResponse) : (this.extractValues(responseData, this.valuePath) as number[]);
  }
}
