import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {BlockchainGasRepository} from '../repositories/BlockchainGasRepository.js';
import {GasMonitor} from '../services/gasMonitor/evm/GasMonitor.js';

@injectable()
class MetricsWorker extends BasicWorker {
  @inject(BlockchainGasRepository) blockchainGasRepository!: BlockchainGasRepository;
  @inject(GasMonitor) gasMonitor!: GasMonitor;

  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    const isLocked = await this.connection.get(this.settings.jobs.metricsReporting.lock.name);
    if (isLocked) return;

    return this.queue.add(this.constructor.name, params, opts);
  };

  isStale = (job: Bull.Job): boolean => {
    const age = new Date().getTime() - job.timestamp;
    return age > this.settings.jobs.blockchainMetrics.interval;
  };

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job)) return;

    const lock = this.settings.jobs.metricsReporting.lock;

    const unlocked = await this.connection.set(lock.name, 'lock', 'EX', lock.ttl, 'NX');

    if (!unlocked) {
      this.logger.error('[MetricsWorker] apply for job but job !unlocked');
      return;
    }

    try {
      this.logger.info('metrics worker start');
      await this.blockchainGasRepository.purge(); // purge before other tasks

      const results = await Promise.allSettled([
        this.gasMonitor.apply(ChainsIds.POLYGON),
        this.gasMonitor.apply(ChainsIds.ARBITRUM),
      ]);

      results.forEach((result, i) => {
        if (result.status == 'rejected') {
          this.logger.error(`[MetricsWorker] #${i}: ${result.reason}`);
        }
      });
    } catch (e) {
      this.logger.error(e);
    } finally {
      await this.connection.del(lock.name);
    }
  };
}

export default MetricsWorker;
