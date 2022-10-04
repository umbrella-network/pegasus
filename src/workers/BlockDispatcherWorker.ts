import {inject, injectable} from 'inversify';
import Bull from 'bullmq';

import {BlockChainDispatcher} from '../services/dispatcher/BlockChainDispatcher';
import {TChainsIds} from '../types/ChainsIds';
import BasicWorker from './BasicWorker';

@injectable()
export class BlockDispatcherWorker extends BasicWorker {
  @inject(BlockChainDispatcher) dispatcher!: BlockChainDispatcher;

  apply = async (job: Bull.Job): Promise<void> => {
    const chainId = job.data.chainId as TChainsIds;
    await this.execute(chainId);
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
