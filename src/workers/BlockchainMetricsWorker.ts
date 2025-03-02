import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker.js';
import {ValidatorsResolver} from '../services/ValidatorsResolver.js';
import {RequiredSignaturesResolver} from '../services/RequiredSignaturesResolver.js';
import {ReleasesResolver} from '../services/files/ReleasesResolver.js';

@injectable()
export class BlockchainMetricsWorker extends BasicWorker {
  @inject(ValidatorsResolver) validatorsResolver!: ValidatorsResolver;
  @inject(RequiredSignaturesResolver) requiredSignaturesResolver!: RequiredSignaturesResolver;
  @inject(ReleasesResolver) releasesResolver!: ReleasesResolver;

  constructor() {
    super();

    this.logPrefix = '[BlockchainMetricsWorker]';
  }

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
      this.logger.error(`${this.logPrefix} apply for job but job !unlocked`);
      return;
    }

    try {
      this.logger.debug(`${this.logPrefix} run`);

      const results = await Promise.allSettled([
        this.validatorsResolver.apply(),
        this.requiredSignaturesResolver.apply(),
        this.releasesResolver.update(),
      ]);

      results.forEach((r) => {
        if (r.status == 'rejected') this.logger.error(`${this.logPrefix} error: ${r.reason}`);
      });
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
    this.logger.debug(`${this.logPrefix} started`);

    super.start();
  };
}
