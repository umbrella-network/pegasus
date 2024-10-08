import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';
import fs from 'fs';
import {Logger} from 'winston';
import {fileURLToPath} from 'url';
import path from 'path';

import Settings from '../types/Settings.js';
import {PriceDataRepository} from '../repositories/PriceDataRepository.js';
import FeedSymbolChecker from '../services/FeedSymbolChecker.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@injectable()
export class HistoryController {
  router: express.Router;
  @inject('Logger') private logger!: Logger;
  @inject(PriceDataRepository) protected priceDataRepository!: PriceDataRepository;
  @inject(FeedSymbolChecker) private feedSymbolChecker!: FeedSymbolChecker;

  constructor(@inject('Settings') private readonly settings: Settings) {
    this.router = express
      .Router()
      .get('/', this.index)
      .get('/latest', this.latestHistory)
      .get('/:symbol', this.symbolHistory)
      .get('/:symbol/csv', this.symbolHistoryCsv)
      .get('/:symbol/chart', this.symbolHistoryChart);
  }

  private index = async (request: Request, response: Response): Promise<void> => {
    const symbols = await this.priceDataRepository.latestSymbols();

    let html = fs.readFileSync(`${__dirname}/../assets/symbolHistoryIndex.html`).toString();

    const links = [
      '<li><a href="/history/latest">all latest</a></li>',
      ...symbols.map(
        (s) => `<li>${s} <a href="/history/${s}/chart">chart</a>, <a href="/history/${s}/csv">csv</a></li>`,
      ),
    ];

    html = html.replace('{{LINKS}}', links.join(''));
    response.set('Content-Type', 'text/html');
    response.send(html);
  };

  private latestHistory = async (_request: Request, response: Response): Promise<void> => {
    const records = await this.priceDataRepository.latest();
    response.send(records);
  };

  private symbolHistory = async (request: Request, response: Response): Promise<void> => {
    const result = this.feedSymbolChecker.apply(request.params.symbol);
    if (!result) return;

    const [feedBase, feedQuote] = result;
    const records = await this.priceDataRepository.latestPrice(feedBase, feedQuote);

    response.send(
      records.map((r) => {
        return {
          fetcher: r.fetcher,
          symbol: r.feedBase + '-' + r.feedQuote,
          value: r.value,
          timestamp: r.timestamp,
          timestampDate: this.toDate(r.timestamp),
        };
      }),
    );
  };

  private symbolHistoryCsv = async (request: Request, response: Response): Promise<void> => {
    const symbol = request.params.symbol;
    const result = this.feedSymbolChecker.apply(symbol);
    if (!result) return;

    const [feedBase, feedQuote] = result;
    const records = await this.priceDataRepository.latestPrice(feedBase, feedQuote);

    response.send(
      records.map((r) => [symbol, r.fetcher, r.value, r.timestamp, this.toDate(r.timestamp)].join(';')).join('<br/>\n'),
    );
  };

  private symbolHistoryChart = async (request: Request, response: Response): Promise<void> => {
    const symbol = request.params.symbol;
    const result = this.feedSymbolChecker.apply(symbol);
    if (!result) {
      response.send(`no history for ${symbol}`);
      return;
    }

    const [feedBase, feedQuote] = result;
    const {data, fetchers} = await this.makeHistoryChartData(feedBase, feedQuote);

    const columns: string[] = new Array(Object.keys(fetchers).length).fill('');
    Object.keys(fetchers).forEach((fetcher) => (columns[fetchers[fetcher]] = fetcher));

    const rows: (number | string)[][] = [];

    Object.keys(data).forEach((timestamp) => {
      const t = parseInt(timestamp);
      rows.push([`'${this.toDate(t)}'`, ...columns.map((f) => data[t][f] ?? 'null')]);
    });

    response.set('Content-Type', 'text/html');
    let html = fs.readFileSync(`${__dirname}/../assets/symbolHistoryChart.html`).toString();

    html = html.split('{{SYMBOL}}').join(request.params.symbol);
    html = html.replace('{{COLUMNS}}', `'${columns.join("','")}'`);
    html = html.replace('{{ROWS}}', this.toJsArray(rows));
    html = html.replace('{{OBSERVATIONS}}', rows.length.toString());

    response.send(html);
  };

  private toDate = (t: number): string => new Date(t * 1000).toISOString().replace('.000Z', '').replace('T', ' ');

  private toJsArray = (arr: (number | string)[][]): string => `[${arr.map((a) => a.toString()).join('],[')}]`;

  private makeHistoryChartData = async (
    feedBase: string,
    feedQuote: string,
  ): Promise<{data: Record<number, Record<string, number>>; fetchers: Record<string, number>}> => {
    const records = await this.priceDataRepository.latestPrice(feedBase, feedQuote);
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
