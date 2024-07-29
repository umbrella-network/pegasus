import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BlockMinter from '../services/BlockMinter.js';
import BasicWorker from './BasicWorker.js';
import PolygonIOPriceInitializer from '../services/PolygonIOPriceInitializer.js';

@injectable()
class BlockMintingWorker extends BasicWorker {
  @inject(BlockMinter) blockMinter!: BlockMinter;
  @inject(PolygonIOPriceInitializer) polygonIOPriceInitializer!: PolygonIOPriceInitializer;

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
      this.logger.warn('BlockMintingWorker apply for job but job !unlocked');
      return;
    }

    try {
      this.logger.debug(`BlockMintingWorker job run at ${new Date().toISOString()}`);
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

    this.polygonIOPriceInitializer.apply().catch((err: Error) => {
      this.logger.error(err);
      process.exit(1);
    });
  };
}

export default BlockMintingWorker;
