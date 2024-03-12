import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';

import Settings from '../types/Settings.js';
import {FetcherHistoryRepository} from '../repositories/FetcherHistoryRepository.js';

@injectable()
export class HistoryController {
  router: express.Router;
  @inject(FetcherHistoryRepository) protected fetcherHistoryRepository!: FetcherHistoryRepository;

  constructor(@inject('Settings') private readonly settings: Settings) {
    this.router = express
      .Router()
      .get('/latest', this.latestHistory)
      .get('/:symbol', this.symbolHistory)
      .get('/:symbol/csv', this.symbolHistoryCsv);
  }

  private latestHistory = async (request: Request, response: Response): Promise<void> => {
    const records = await this.fetcherHistoryRepository.latest();
    response.send(records);
  };

  private symbolHistory = async (request: Request, response: Response): Promise<void> => {
    const records = await this.fetcherHistoryRepository.latestSymbol(request.params.symbol);
    response.send(records);
  };

  private symbolHistoryCsv = async (request: Request, response: Response): Promise<void> => {
    const records = await this.fetcherHistoryRepository.latestSymbol(request.params.symbol);
    response.send(records.map((r) => [r.symbol, r.fetcher, r.value, r.timestamp].join(';')).join('<br/>\n'));
  };
}
