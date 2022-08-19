import {inject, injectable} from 'inversify';
import Bull from 'bullmq';

import {BlockChainDispatcher} from '../services/dispatcher/BlockChainDispatcher';
import {SingletonWorker} from './SingletonWorker';
import {TChainsIds} from '../types/ChainsIds';

@injectable()
export class BlockDispatcherWorker extends SingletonWorker {
  @inject(BlockChainDispatcher) dispatcher!: BlockChainDispatcher;

  apply = async (job: Bull.Job): Promise<void> => {
    const interval = parseInt(job.data.interval);
    const lockTTL = parseInt(job.data.lockTTL);
    const chainId = job.data.chainId as TChainsIds;
    if (this.isStale(job, interval)) return;

    await this.synchronizeWork(chainId, lockTTL, async () => this.execute(chainId));
  };

  private execute = async (chainId: TChainsIds): Promise<void> => {
    try {
      this.logger.info(`[${chainId}] Starting Block Dispatcher`);
      await this.dispatcher.apply({chainId});
      this.logger.info(`[${chainId}] Block Dispatcher Complete`);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      throw new Error(`[${chainId}] ${e.message}`);
    }
  };
}
