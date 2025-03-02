import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker.js';
import {PriceFetcherRepository} from '../repositories/PriceFetcherRepository.js';
import {SchedulerFetcherSettings} from '../types/Settings.js';

@injectable()
class PriceFetchingWorker extends BasicWorker {
  @inject(PriceFetcherRepository) priceFetcherServiceRepository!: PriceFetcherRepository;

  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    // example of params and opts:
    // this.logger.debug(`[PriceFetchingWorker] enqueue params: ${JSON.stringify(params)}`);
    // this.logger.debug(`[PriceFetchingWorker] enqueue opts: ${JSON.stringify(opts)}`);
    // this.logger.debug(`[PriceFetchingWorker] enqueue this.constructor.name: ${this.constructor.name}`);

    // info: [Scheduler] PriceFetcherWorker: ByBitPrice
    // debug: [PriceFetchingWorker] enqueue params: {"fetcherName":"ByBitPrice"}
    // debug: [PriceFetchingWorker] enqueue opts: {"removeOnComplete":true,"removeOnFail":true,"jobId":"ByBitPrice-987"}
    // debug: [PriceFetchingWorker] enqueue this.constructor.name: PriceFetchingWorker

    const name = (params as {fetcherName: string}).fetcherName;
    const isLocked = await this.connection.get(name);
    if (isLocked) return;

    return this.queue.add(this.constructor.name, params, opts);
  };

  apply = async (job: Bull.Job): Promise<void> => {
    const {fetcherName} = job.data;
    const loggerPrefix = `[PriceFetchingWorker.${fetcherName}]`;

    if (this.isStale(job)) {
      this.logger.debug(`${loggerPrefix} stale`);
      return;
    }

    this.logger.debug(`${loggerPrefix} NOT stale`);

    if (!this.checkIsValidSettings(job.data.fetcherName)) {
      this.logger.warn(`${loggerPrefix} apply for job but job has invalid settings`);
      return;
    }

    const {lock} = this.workerSettings(fetcherName);
    const unlocked = await this.connection.set(lock.name, 'lock', 'EX', lock.ttl, 'NX');

    if (!unlocked) {
      const data = await this.connection.ttl(lock.name);
      this.logger.error(`${loggerPrefix} job locked: ${lock.name}, ttl: ${lock.ttl}, left: ${JSON.stringify(data)}s`);
      return;
    }

    try {
      this.logger.debug(`${loggerPrefix} job run for ${fetcherName}`);
      await this.priceFetcherServiceRepository.get(fetcherName)?.apply();
    } catch (e) {
      this.logger.error(`${loggerPrefix} ${(e as Error).message}`);
    } finally {
      this.logger.debug(`${loggerPrefix} connection.del`);
      await this.connection.del(lock.name);
    }
  };

  start = (): void => {
    super.start();
    this.logger.debug('[PriceFetchingWorker] started');
  };

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.workerSettings(job.data.fetcherName).interval;
  };

  checkIsValidSettings = (fetcherName: string) => {
    return this.workerSettings(fetcherName).interval > 0;
  };

  workerSettings = (fetcherName: string): SchedulerFetcherSettings => {
    const cfg = this.settings.scheduler.fetchers[fetcherName];
    if (!cfg) throw new Error(`this.settings.scheduler.fetchers[${fetcherName}]`);

    return cfg;
  };
}

export default PriceFetchingWorker;
