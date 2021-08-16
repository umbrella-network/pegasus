import Bull from 'bullmq';
import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import Settings from '../types/Settings';

import WalletBalanceReporter from '../services/WalletBalanceReporter';
import BasicWorker from './BasicWorker';

@injectable()
class MetricsWorker extends BasicWorker {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(WalletBalanceReporter) walletBalanceReporter!: WalletBalanceReporter;

  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    const isLocked = await this.connection.get(this.settings.jobs.metricsReporting.lock.name);

    if (isLocked) return;

    return this.queue.add(this.constructor.name, params, opts);
  };

  apply = async (job: Bull.Job): Promise<void> => {
    const lockName = this.settings.jobs.metricsReporting.lock.name;
    const lockTTL = this.settings.jobs.metricsReporting.lock.ttl;

    const unlocked = await this.connection.set(lockName, 'lock', 'EX', lockTTL, 'NX');

    if (!unlocked) return;

    try {
      this.logger.info(`Sending metrics to NewRelic ${job.data}`);
      await this.walletBalanceReporter.call();
    } catch (e) {
      this.logger.error(e);
    } finally {
      await this.connection.del(lockName);
    }
  };
}

export default MetricsWorker;
