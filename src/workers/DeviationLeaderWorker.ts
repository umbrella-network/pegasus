import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker.js';
import {DeviationLeader} from '../services/deviationsFeeds/DeviationLeader.js';

@injectable()
export class DeviationLeaderWorker extends BasicWorker {
  @inject(DeviationLeader) deviationLeader!: DeviationLeader;
  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    const isLocked = await this.connection.get(this.settings.deviationTrigger.lock.name);
    if (isLocked) return;

    return this.queue.add(this.constructor.name, params, opts);
  };

  apply = async (job: Bull.Job): Promise<void> => {
    // CryptoCompareWSInitializer is started in BlockMintingWorker
    // we need them for providing prices
    const {lock} = this.settings.deviationTrigger;

    if (this.isStale(job)) return;

    const unlocked = await this.connection.set(lock.name, 'lock', 'EX', lock.ttl, 'NX');

    if (!unlocked) {
      this.logger.error('[DeviationLeaderWorker] apply for job but job !unlocked');
      return;
    }

    try {
      this.logger.debug(`[DeviationLeaderWorker] job run at ${new Date().toISOString()}`);
      await this.deviationLeader.apply();
    } catch (e) {
      this.logger.error(e);
    } finally {
      await this.connection.del(lock.name);
    }
  };

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.settings.deviationTrigger.leaderInterval;
  };

  start = (): void => {
    super.start();
  };
}
