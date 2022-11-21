import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker';
import {FeedDataCollector} from '../services/FeedDataCollector';

@injectable()
export class FeedDataWorker extends BasicWorker {
  @inject(FeedDataCollector) feedDataCollector!: FeedDataCollector;

  apply = async (): Promise<void> => {
    await this.execute();
  };

  private execute = async (): Promise<void> => {
    try {
      this.logger.info(`Starting Feed Data Worker`);
      await this.feedDataCollector.apply();
      this.logger.info(`Feed Data Worker Finished`);
    } catch (e: unknown) {
      throw new Error(`[FeedDataWorker] ${(e as Error).message}`);
    }
  };
}
