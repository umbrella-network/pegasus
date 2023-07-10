import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker';
import {ValidatorsResolver} from '../services/ValidatorsResolver';
import {RequiredSignaturesResolver} from '../services/RequiredSignaturesResolver';

@injectable()
export class BlockchainMetricsWorker extends BasicWorker {
  @inject(ValidatorsResolver) validatorsResolver!: ValidatorsResolver;
  @inject(RequiredSignaturesResolver) requiredSignaturesResolver!: RequiredSignaturesResolver;

  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    const isLocked = await this.connection.get(this.settings.jobs.blockchainMetrics.lock.name);
    if (isLocked) return;

    return this.queue.add(this.constructor.name, params, opts);
  };

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job)) return;

    const {lock} = this.settings.jobs.blockchainMetrics;

    const unlocked = await this.connection.set(lock.name, 'lock', 'EX', lock.ttl, 'NX');

    if (!unlocked) {
      this.logger.error(`[BlockchainMetricsWorker] apply for job but job !unlocked`);
      return;
    }

    try {
      this.logger.debug(`[BlockchainMetricsWorker] job run at ${new Date().toISOString()}`);
      await Promise.all([this.validatorsResolver.apply(), this.requiredSignaturesResolver.apply()]);
    } catch (e) {
      this.logger.error(e);
    } finally {
      await this.connection.del(lock.name);
    }
  };

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.settings.jobs.blockchainMetrics.interval;
  };

  start = (): void => {
    super.start();
  };
}
