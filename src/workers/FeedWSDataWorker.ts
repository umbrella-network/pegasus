import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker';
import {FeedWSDataCollector} from '../services/FeedWSDataCollector';

@injectable()
export class FeedWSDataWorker extends BasicWorker {
  @inject(FeedWSDataCollector) feedWSDataCollector!: FeedWSDataCollector;

  apply = async (): Promise<void> => {
    try {
      this.logger.info(`Starting Feed WS Data Worker`);
      await this.feedWSDataCollector.apply();
      this.logger.info(`Feed WS Data Worker Finished`);
    } catch (e: unknown) {
      throw new Error(`[FeedWSDataWorker] ${(e as Error).message}`);
    }
  };
}
