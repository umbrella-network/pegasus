import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {FetcherHistoryRepository} from '../../repositories/FetcherHistoryRepository.js';
import {FeedFetcherInterface, FeedFetcherInterfaceResult, FetcherHistoryInterface} from '../../types/fetchers.js';

@injectable()
export abstract class AbstractFetcher implements FeedFetcherInterface {
  @inject(FetcherHistoryRepository) private priceHistoryRepository!: FetcherHistoryRepository;

  @inject('Logger') protected logger!: Logger;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  abstract apply(params: any, timestamp?: number): FeedFetcherInterfaceResult;

  protected async saveHistory(params: FetcherHistoryInterface): Promise<void> {
    await this.priceHistoryRepository.save(params);
  }

  protected async saveHistories(params: FetcherHistoryInterface[]): Promise<void> {
    await this.priceHistoryRepository.saveMany(params);
  }
}
