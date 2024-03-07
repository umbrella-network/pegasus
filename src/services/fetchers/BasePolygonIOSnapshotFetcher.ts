import {injectable} from 'inversify';
import axios from 'axios';
import {JSONPath} from 'jsonpath-plus';

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
export abstract class BasePolygonIOSnapshotFetcher {
  protected apiKey!: string;
  protected timeout!: number;
  protected valuePath!: string;

  protected async fetch(sourceUrl: string, raw = false): Promise<SnapshotResponse | number[]> {
    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    return raw ? (response.data as SnapshotResponse) : (this.extractValues(response.data, this.valuePath) as number[]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValues = (data: any, valuePath: string): number[] => {
    return JSONPath({json: data, path: valuePath});
  };
}
