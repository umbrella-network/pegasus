import {inject, injectable} from 'inversify';
import Bull from 'bullmq';

import {BlockChainDispatcher} from '../services/dispatchers/BlockChainDispatcher.js';
import {ChainsIds} from '../types/ChainsIds.js';
import BasicWorker from './BasicWorker.js';

@injectable()
export class BlockDispatcherWorker extends BasicWorker {
  @inject(BlockChainDispatcher) dispatcher!: BlockChainDispatcher;

  apply = async (job: Bull.Job): Promise<void> => {
    const chainId = job.data.chainId as ChainsIds;
    await this.execute(chainId);
  };

  private execute = async (chainId: ChainsIds): Promise<void> => {
    try {
      this.logger.debug(`[${chainId}] Starting Block Dispatcher`);
      await this.dispatcher.apply({chainId});
      this.logger.debug(`[${chainId}] Block Dispatcher Complete`);
    } catch (e: unknown) {
      throw new Error(`[${chainId}] ${(e as Error).message}`);
    }
  };
}
