import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker.js';
import {UniswapV3LiquidityResolver} from '../services/dexes/uniswapV3/UniswapV3LiquidityResolver.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {DexProtocolName} from '../types/Dexes.js';

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
    const loggerPrefix = `[UniswapV3LiquidityWorker][${job.data.chainId}][${job.data.protocol}]`;

    const {lock} = job.data.settings;
    const unlocked = await this.connection.set(lock.name, 'lock', 'EX', lock.ttl, 'NX');

    if (!unlocked) {
      this.logger.error(`${loggerPrefix} apply for job but job !unlocked`);
      return;
    }

    const isValidSettings = this.checkIsValidSettings(job.data);

    if (!isValidSettings) {
      this.logger.error(`${loggerPrefix} apply for job but job has invalid settings`);
      return;
    }

    try {
      this.logger.debug(`${loggerPrefix} job run at ${new Date().toISOString()}`);
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

  checkIsValidSettings = (jobData: {chainId: ChainsIds; protocol: DexProtocolName}) => {
    return Boolean(this.settings.dexes[jobData?.chainId]?.[jobData?.protocol]?.subgraphUrl);
  };
}

export default UniswapV3LiquidityWorker;
