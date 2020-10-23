import { getModelForClass } from '@typegoose/typegoose';
import { Job } from 'bullmq';
import { Logger } from 'winston';
import { inject, injectable } from 'inversify';
import Feed from '../models/Feed';
import BasicWorker from './BasicWorker';
import FeedSynchronizer from '../services/FeedSynchronizer';

@injectable()
class FeedDataUpdateWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject(FeedSynchronizer) feedSynchronizer!: FeedSynchronizer;

  async apply(job: Job): Promise<void> {
    try {
      const feedId: string = job.data.feedId;
      const feed = await getModelForClass(Feed).findById(feedId).exec();

      if (!feed) {
        this.logger.info(`No feeds found for ${feedId}.`);
        return;
      }

      this.logger.info(`Synchronizing Feed ${feed.id}`)
      await this.feedSynchronizer.apply(feed);
      feed.lastSynchronizedAt = new Date();
      feed.save();
    } catch (e) {
      this.logger.error(e);
    }
  }
}

export default FeedDataUpdateWorker;
