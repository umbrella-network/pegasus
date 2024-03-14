import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';
import fs from 'fs';
import {Logger} from 'winston';
import {fileURLToPath} from 'url';
import path from 'path';

import Settings from '../types/Settings.js';
import {FetcherHistoryRepository} from '../repositories/FetcherHistoryRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@injectable()
export class HistoryController {
  router: express.Router;
  @inject('Logger') private logger!: Logger;
  @inject(FetcherHistoryRepository) protected fetcherHistoryRepository!: FetcherHistoryRepository;

  constructor(@inject('Settings') private readonly settings: Settings) {
    this.router = express
      .Router()
      .get('/latest', this.latestHistory)
      .get('/:symbol', this.symbolHistory)
      .get('/:symbol/csv', this.symbolHistoryCsv)
      .get('/:symbol/chart', this.symbolHistoryChart);
  }

  private latestHistory = async (request: Request, response: Response): Promise<void> => {
    const records = await this.fetcherHistoryRepository.latest();
    response.send(records);
  };

  private symbolHistory = async (request: Request, response: Response): Promise<void> => {
    const records = await this.fetcherHistoryRepository.latestSymbol(request.params.symbol);

    response.send(
      records.map((r) => {
        return {
          fetcher: r.fetcher,
          symbol: r.symbol,
          value: r.value,
          timestamp: r.timestamp,
          timestampDate: this.toDate(r.timestamp),
        };
      }),
    );
  };

  private symbolHistoryCsv = async (request: Request, response: Response): Promise<void> => {
    const records = await this.fetcherHistoryRepository.latestSymbol(request.params.symbol);

    response.send(
      records
        .map((r) => [r.symbol, r.fetcher, r.value, r.timestamp, this.toDate(r.timestamp)].join(';'))
        .join('<br/>\n'),
    );
  };

  private symbolHistoryChart = async (request: Request, response: Response): Promise<void> => {
    const {data, fetchers} = await this.makeHistoryChartData(request.params.symbol);

    const columns: string[] = new Array(Object.keys(fetchers).length).fill('');
    Object.keys(fetchers).forEach((fetcher) => (columns[fetchers[fetcher]] = fetcher));

    const rows: number[][] = [];

    Object.keys(data).forEach((timestamp) => {
      const t = parseInt(timestamp);
      rows.push([t, ...columns.map((f) => data[t][f] ?? 'null')]);
    });

    response.set('Content-Type', 'text/html');
    let html = fs.readFileSync(`${__dirname}/../assets/symbolHistoryChart.html`).toString();

    html = html.split('{{SYMBOL}}').join(request.params.symbol);
    html = html.replace('{{COLUMNS}}', `'${columns.join("','")}'`);
    html = html.replace('{{ROWS}}', this.toJsArray(rows));

    response.send(html);
  };

  private toDate = (t: number): string => new Date(t * 1000).toISOString();

  private toJsArray = (arr: number[][]): string => `[${arr.map((a) => a.toString()).join('],[')}]`;

  private makeHistoryChartData = async (
    symbol: string,
  ): Promise<{data: Record<number, Record<string, number>>; fetchers: Record<string, number>}> => {
    const records = await this.fetcherHistoryRepository.latestSymbol(symbol);
    const data: Record<number, Record<string, number>> = {};
    const fetchers: Record<string, number> = {};

    records
      .sort((a, b) => a.timestamp - b.timestamp)
      .forEach((r) => {
        if (!data[r.timestamp]) data[r.timestamp] = {};
        data[r.timestamp][r.fetcher] = parseFloat(r.value);

        if (fetchers[r.fetcher] === undefined) {
          fetchers[r.fetcher] = Object.keys(fetchers).length;
        }
      });

    return {data, fetchers};
  };
}
