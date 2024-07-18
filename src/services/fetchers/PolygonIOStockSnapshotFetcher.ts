import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings.js';
import {SnapshotResponse, Ticker} from './BasePolygonIOSnapshotFetcher.js';
import {FetcherName} from '../../types/fetchers.js';

@injectable()
class PolygonIOStockSnapshotFetcher {
  @inject('Logger') logger!: Logger;

  private apiKey: string;
  private timeout: number;
  private maxBatchSize: number;
  private logPrefix = `[${FetcherName.POLYGON_IO_STOCK_SNAPSHOT}]`;

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.polygonIO.apiKey;
    this.maxBatchSize = settings.api.polygonIO.maxBatchSize;
    this.timeout = settings.api.polygonIO.timeout;
  }

  async apply({symbols}: {symbols: string[]}, raw = false): Promise<SnapshotResponse | number[]> {
    const tickerBatches = this.splitIntoBatchesOfSize(symbols, this.maxBatchSize);

    this.logger.debug(`${this.logPrefix} call for ${symbols.join(', ')}`);

    const snapshot = await this.getSnapshot(tickerBatches);
    const mergedSnapshot = {tickers: this.mergeData(snapshot)};

    return raw ? mergedSnapshot : (this.extractValues(mergedSnapshot, '$.tickers[*].lastTrade.p') as number[]);
  }

  private async getSnapshot(tickerBatches: string[]): Promise<SnapshotDataResponse[]> {
    return Promise.all(
      tickerBatches.map(async (tickers: string) => {
        const sourceUrl =
          'https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers' +
          `?tickers=${tickers}&apiKey=${this.apiKey}`;

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

  private splitIntoBatchesOfSize = (symbols: string[], maxBatchSize: number): string[] => {
    const batches = [];
    const symbolsCopy = [...symbols];

    while (symbolsCopy.length) {
      batches.push(symbolsCopy.splice(0, maxBatchSize).join(','));
    }

    return batches;
  };

  private mergeData = (snapshot: SnapshotDataResponse[]): Ticker[] => {
    let acc: Ticker[] = [];

    for (let i = 0; i < snapshot.length; i++) {
      acc = [...acc, ...snapshot[i].data.tickers];
    }

    return acc;
  };
}

export interface SnapshotDataResponse {
  data: SnapshotResponse;
}

export default PolygonIOStockSnapshotFetcher;
