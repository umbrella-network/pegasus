import Bull from 'bullmq';
import {injectable} from 'inversify';

import BasicWorker from './BasicWorker';

@injectable()
class MetricsWorker extends BasicWorker {
  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    const isLocked = await this.connection.get(this.settings.jobs.metricsReporting.lock.name);
    if (isLocked) return;

    return this.queue.add(this.constructor.name, params, opts);
  };

  apply = async (job: Bull.Job): Promise<void> => {
    const lock = this.settings.jobs.metricsReporting.lock;

    const unlocked = await this.connection.set(lock.name, 'lock', 'EX', lock.ttl, 'NX');

    if (!unlocked) {
      this.logger.error(`[MetricsWorker] apply for job but job !unlocked`);
      return;
    }

    try {
      this.logger.info(`metrics worker ${job.data}`);
      // placeholder for jobs
    } catch (e) {
      this.logger.error(e);
    } finally {
      await this.connection.del(lock.name);
    }
  };
}

export default MetricsWorker;
