import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BlockMinter from '../services/BlockMinter';
import BasicWorker from './BasicWorker';

@injectable()
class BlockMintingWorker extends BasicWorker {
  @inject(BlockMinter) blockMinter!: BlockMinter;

  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    const isLocked = await this.connection.get(this.settings.jobs.blockCreation.lock.name);
    if (isLocked) return;

    return this.queue.add(this.constructor.name, params, opts);
  };

  apply = async (job: Bull.Job): Promise<void> => {
    const lockName = this.settings.jobs.blockCreation.lock.name;
    const lockTTL = this.settings.jobs.blockCreation.lock.ttl;

    if (this.isStale(job)) return;

    const unlocked = await this.connection.set(lockName, 'lock', 'EX', lockTTL, 'NX');

    if (!unlocked) {
      this.logger.info(`BlockMintingWorker apply for job but job !unlocked`);
      return;
    }

    try {
      this.logger.info(`BlockMintingWorker job run at ${new Date().toISOString()}`);
      await this.blockMinter.apply();
    } catch (e) {
      this.logger.error(e);
    } finally {
      await this.connection.del(lockName);
    }
  };

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.settings.jobs.blockCreation.interval;
  };

  start = (): void => {
    super.start();
  };
}

export default BlockMintingWorker;
