import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker';
import {ValidatorsResolver} from '../services/ValidatorsResolver';

@injectable()
export class ValidatorListWorker extends BasicWorker {
  @inject(ValidatorsResolver) validatorsResolver!: ValidatorsResolver;
  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    const isLocked = await this.connection.get(this.settings.jobs.validatorsResolver.lock.name);
    if (isLocked) return;

    return this.queue.add(this.constructor.name, params, opts);
  };

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job)) return;

    const {lock} = this.settings.jobs.validatorsResolver;

    const unlocked = await this.connection.set(lock.name, 'lock', 'EX', lock.ttl, 'NX');

    if (!unlocked) {
      this.logger.error(`[ValidatorListWorker] apply for job but job !unlocked`);
      return;
    }

    try {
      this.logger.debug(`[ValidatorListWorker] job run at ${new Date().toISOString()}`);
      await this.validatorsResolver.apply();
    } catch (e) {
      this.logger.error(e);
    } finally {
      await this.connection.del(lock.name);
    }
  };

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.settings.jobs.validatorsResolver.interval;
  };

  start = (): void => {
    super.start();
  };
}
