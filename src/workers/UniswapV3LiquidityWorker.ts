import Bull from 'bullmq';
import {inject, injectable} from 'inversify';

import BasicWorker from './BasicWorker.js';
import {UniswapV3LiquidityResolver} from './fetchers/dexes/uniswapV3/UniswapV3LiquidityResolver.js';
import {UniswapV3PoolsDiscovery} from './fetchers/dexes/uniswapV3/UniswapV3PoolsDiscovery.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {DexProtocolName} from '../types/Dexes.js';

@injectable()
class UniswapV3LiquidityWorker extends BasicWorker {
  @inject(UniswapV3LiquidityResolver) uniswapV3LiquidityResolver!: UniswapV3LiquidityResolver;
  @inject(UniswapV3PoolsDiscovery) uniswapV3PoolsDiscovery!: UniswapV3PoolsDiscovery;

  enqueue = async <T>(params: T, opts?: Bull.JobsOptions): Promise<Bull.Job<T> | undefined> => {
    const name = (params as {name: string}).name;
    const isLocked = await this.connection.get(name);
    if (isLocked) return;

    return this.queue.add(this.constructor.name, params, opts);
  };

  apply = async (job: Bull.Job): Promise<void> => {
    if (this.isStale(job)) return;

    const loggerPrefix = `[UniswapV3LiquidityWorker][${job.data.chainId}][${job.data.protocol}]`;
    const isValidSettings = this.checkIsValidSettings(job.data);

    if (!isValidSettings) {
      this.logger.debug(`${loggerPrefix} apply for job but job has invalid settings`);
      return;
    }

    const {lock} = job.data.settings;
    const unlocked = await this.connection.set(lock.name, 'lock', 'EX', lock.ttl, 'NX');

    if (!unlocked) {
      this.logger.error(`${loggerPrefix} apply for job but job !unlocked`);
      return;
    }

    this.logger.debug(`${loggerPrefix} start at ${new Date().toISOString()}`);

    const results = await Promise.allSettled([
      this.uniswapV3LiquidityResolver.apply(job.data.chainId),
      this.uniswapV3PoolsDiscovery.apply(job.data.chainId),
    ]);

    results.forEach((r, i) => {
      if (r.status == 'rejected') this.logger.error(`${loggerPrefix} error[${i}]: ${r.reason}`);
    });

    await this.connection.del(lock.name);
  };

  start = (): void => {
    super.start();
  };

  checkIsValidSettings = (jobData: {chainId: ChainsIds; protocol: DexProtocolName}) => {
    const url = this.settings.dexes[jobData?.chainId]?.[jobData?.protocol]?.subgraphUrl;

    if (!url) {
      this.logger.error(
        `[${jobData?.chainId}][checkIsValidSettings] missing subgraphUrl for protocol: ${jobData?.protocol}`,
      );
      return false;
    }

    return true;
  };
}

export default UniswapV3LiquidityWorker;
