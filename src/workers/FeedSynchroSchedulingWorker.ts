import { getModelForClass } from '@typegoose/typegoose';
import { Job } from 'bullmq';
import { inject, injectable } from 'inversify';
import Feed from '../models/Feed';
import BasicWorker from './BasicWorker';
import FeedDataUpdateWorker from './FeedDataUpdateWorker';

@injectable()
class FeedSynchroSchedulingWorker extends BasicWorker {
  @inject(FeedDataUpdateWorker) feedSynchronizerWorker!: FeedDataUpdateWorker;

  async apply(job: Job<any, any>): Promise<void> {
    const referenceTime = new Date(new Date().getTime() - 60*1000);

    const feeds: Feed[] = await getModelForClass(Feed)
      .find({ lastSynchronizedAt: { $lte: referenceTime } })
      .exec();

    feeds.forEach(async (feed) => {
      await this.feedSynchronizerWorker.enqueue({ feedId: feed._id });
    });
  }
}

export default FeedSynchroSchedulingWorker;
