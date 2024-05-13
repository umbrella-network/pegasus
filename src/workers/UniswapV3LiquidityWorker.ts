import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker.js';
import {UniswapV3LiquidityResolver} from '../services/dexes/uniswapV3/UniswapV3LiquidityResolver.js';

@injectable()
class UniswapV3LiquidityWorker extends BasicWorker {
  @inject(UniswapV3LiquidityResolver) uniswapV3LiquidityResolver!: UniswapV3LiquidityResolver;

  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    const name = (params as {name: string}).name;
    const isLocked = await this.connection.get(name);
    if (isLocked) return;

    return this.queue.add(this.constructor.name, params, opts);
  };

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job)) return;

    const {lock} = job.data.settings;
    const unlocked = await this.connection.set(lock.name, 'lock', 'EX', lock.ttl, 'NX');

    if (!unlocked) {
      this.logger.error('[UniswapV3LiquidityWorker] apply for job but job !unlocked');
      return;
    }

    try {
      this.logger.debug(`[UniswapV3LiquidityWorker] job run at ${new Date().toISOString()}`);
      await this.uniswapV3LiquidityResolver.apply(job.data.chainId);
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
}

export default UniswapV3LiquidityWorker;
