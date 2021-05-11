import axios from 'axios';
import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings';

@injectable()
class PolygonIOSnapshotFetcher {
  private apiKey: string;
  private timeout: number;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
  }

  async apply({symbols}: any, raw = false): Promise<SnapshotResponse | number[]> {
    const sourceUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${symbols.join(',')}&apiKey=${this.apiKey}`;

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    return raw ? (response.data as SnapshotResponse) : this.extractValues(response.data, '$.tickers[*].lastTrade.p') as number[];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValues = (data: any, valuePath: string): number[] => {
    return JSONPath({json: data, path: valuePath});
  }
}

export interface Ticker {
  ticker: string;
  lastTrade: {
    p: number,
    t: number,
  },
}

export interface SnapshotResponse {
  tickers: Ticker[],
}

export default PolygonIOSnapshotFetcher;
