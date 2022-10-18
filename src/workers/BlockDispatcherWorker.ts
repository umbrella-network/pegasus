import {inject, injectable} from 'inversify';
import Bull from 'bullmq';

import {BlockChainDispatcher} from '../services/dispatcher/BlockChainDispatcher';
import {ChainsIds} from '../types/ChainsIds';
import BasicWorker from './BasicWorker';

@injectable()
export class BlockDispatcherWorker extends BasicWorker {
  @inject(BlockChainDispatcher) dispatcher!: BlockChainDispatcher;

  apply = async (job: Bull.Job): Promise<void> => {
    const chainId = job.data.chainId as ChainsIds;
    await this.execute(chainId);
  };

  private execute = async (chainId: ChainsIds): Promise<void> => {
    try {
      this.logger.info(`[${chainId}] Starting Block Dispatcher`);
      await this.dispatcher.apply({chainId});
      this.logger.info(`[${chainId}] Block Dispatcher Complete`);
    } catch (e: unknown) {
      throw new Error(`[${chainId}] ${(e as Error).message}`);
    }
  };
}
