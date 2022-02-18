import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings';

@injectable()
class PolygonIOStockSnapshotFetcher {
  private apiKey: string;
  private timeout: number;
  private maxBatchSize: number;
  @inject('Logger') logger!: Logger;

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.polygonIO.apiKey;
    this.maxBatchSize = settings.api.polygonIO.maxBatchSize;
    this.timeout = settings.api.polygonIO.timeout;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
  async apply({symbols}: any, raw = false): Promise<SnapshotResponse | number[]> {
    const tickerBatches = this.splitIntoSmallerBatches(symbols, this.maxBatchSize);

    this.logger.debug('Calling polygon snapshot');

    const snapshot = await this.getSnapshot(tickerBatches);
    const mergedSnapshot = {tickers: this.mergeData(snapshot)};

    return raw ? mergedSnapshot : (this.extractValues(mergedSnapshot, '$.tickers[*].lastTrade.p') as number[]);
  }

  private async getSnapshot(tickerBatches: string[]): Promise<SnapshotDataResponse[]> {
    return Promise.all(
      tickerBatches.map(async (tickers: string) => {
        const sourceUrl = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=${tickers}&apiKey=${this.apiKey}`;

        const response = await axios.get(sourceUrl, {
          timeout: this.timeout,
          timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
        });

        if (response.status !== 200) {
          throw new Error(response.data);
        }

        return response;
      }),
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValues = (data: any, valuePath: string): number[] => {
    return JSONPath({json: data, path: valuePath});
  };

  private splitIntoSmallerBatches = (symbols: string[], maxBatchSize: number): string[] => {
    const batches = [];
    const symbolsCopy = [...symbols];

    while (symbolsCopy.length) {
      batches.push(symbolsCopy.splice(0, maxBatchSize).join(','));
    }

    return batches;
  };

  private mergeData = (snapshot: SnapshotDataResponse[]): Ticker[] =>
    snapshot.reduce((acc: Ticker[], curr: SnapshotDataResponse) => acc.concat(curr.data.tickers), []);
}

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

export interface SnapshotDataResponse {
  data: SnapshotResponse;
}

export default PolygonIOStockSnapshotFetcher;
