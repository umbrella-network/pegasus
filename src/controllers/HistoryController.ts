import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';

import Settings from '../types/Settings.js';
import {FetcherHistoryRepository} from '../repositories/FetcherHistoryRepository.js';

@injectable()
export class HistoryController {
  router: express.Router;
  @inject(FetcherHistoryRepository) protected fetcherHistoryRepository!: FetcherHistoryRepository;

  constructor(@inject('Settings') private readonly settings: Settings) {
    this.router = express.Router().get('/latest', this.latestHistory);
  }

  private latestHistory = async (request: Request, response: Response): Promise<void> => {
    const records = await this.fetcherHistoryRepository.latest();
    response.send(records);
  };
}
