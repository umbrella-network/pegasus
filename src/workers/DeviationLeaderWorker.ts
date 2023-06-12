import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker';
import {DeviationTrigger} from '../services/deviationsFeeds/DeviationTrigger';

@injectable()
export class DeviationLeaderWorker extends BasicWorker {
  @inject(DeviationTrigger) deviationTrigger!: DeviationTrigger;
  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    const isLocked = await this.connection.get(this.settings.deviationTrigger.lock.name);
    if (isLocked) return;

    return this.queue.add(this.constructor.name, params, opts);
  };

  apply = async (job: Bull.Job): Promise<void> => {
    // CryptoCompareWSInitializer and PolygonIOPriceInitializer are started in BlockMintingWorker
    // we need them for providing prices
    const {lock, leader} = this.settings.deviationTrigger;

    if (!leader) {
      this.logger.info(`[DeviationLeaderWorker] not a leader`);
      return;
    }

    if (this.isStale(job)) return;

    const unlocked = await this.connection.set(lock.name, 'lock', 'EX', lock.ttl, 'NX');

    if (!unlocked) {
      this.logger.info(`[DeviationLeaderWorker] apply for job but job !unlocked`);
      return;
    }

    try {
      this.logger.info(`[DeviationLeaderWorker] job run at ${new Date().toISOString()}`);
      await this.deviationTrigger.apply();
    } catch (e) {
      this.logger.error(e);
    } finally {
      await this.connection.del(lock.name);
    }
  };

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.settings.deviationTrigger.interval;
  };

  start = (): void => {
    super.start();
  };
}
