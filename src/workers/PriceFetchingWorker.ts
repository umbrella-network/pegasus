import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker.js';
import {PriceFetcherServiceRepository} from '../repositories/PriceFetcherServiceRepository.js';

@injectable()
class PriceFetchingWorker extends BasicWorker {
  @inject(PriceFetcherServiceRepository) priceFetcherServiceRepository!: PriceFetcherServiceRepository;

  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    const name = (params as {name: string}).name;
    const isLocked = await this.connection.get(name);
    if (isLocked) return;

    return this.queue.add(this.constructor.name, params, opts);
  };

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job)) return;

    if (!this.checkIsValidSettings(job.data.fetcherName)) {
      this.logger.debug(`${job.data.fetcherName} apply for job but job has invalid settings`);
      return;
    }

    const {fetcherName} = job.data;
    const loggerPrefix = `[PriceFetchingWorker][${fetcherName}]`;
    const {lock} = job.data.settings;
    const unlocked = await this.connection.set(lock.name, 'lock', 'EX', lock.ttl, 'NX');

    if (!unlocked) {
      this.logger.error(`${loggerPrefix} apply for job but job !unlocked`);
      return;
    }

    try {
      this.logger.debug(`${loggerPrefix} job run at ${new Date().toISOString()}`);
      await this.priceFetcherServiceRepository.get(fetcherName)?.apply();
    } catch (e) {
      this.logger.error(e);
    } finally {
      await this.connection.del(lock.name);
    }
  };

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > job.data.settings.interval;
  };

  start = (): void => {
    super.start();
  };

  checkIsValidSettings = (fetcherName: string) => {
    const interval = this.settings.scheduler.fetchers[fetcherName]?.interval;
    return interval !== undefined && interval > 0;
  };
}

export default PriceFetchingWorker;
