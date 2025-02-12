import {inject, injectable} from 'inversify';
import Bull from 'bullmq';

import {DeviationFeedsDispatcher} from '../services/dispatchers/DeviationFeedsDispatcher.js';
import {ChainsIds} from '../types/ChainsIds.js';
import BasicWorker from './BasicWorker.js';

@injectable()
export class DeviationDispatcherWorker extends BasicWorker {
  @inject(DeviationFeedsDispatcher) dispatcher!: DeviationFeedsDispatcher;

  constructor() {
    super();

    this.logPrefix = '[DeviationDispatcherWorker]';
  }

  apply = async (job: Bull.Job): Promise<void> => {
    const chainId = job.data.chainId as ChainsIds;
    await this.execute(chainId);
  };

  private execute = async (chainId: ChainsIds): Promise<void> => {
    try {
      this.printNotImportantDebug(`[${chainId}] Starting Deviation Feeds Dispatcher`);
      await this.dispatcher.apply({chainId});
      this.printNotImportantDebug(`[${chainId}] Deviation Feeds Dispatcher Complete`);
    } catch (e: unknown) {
      throw new Error(`[${chainId}] ${(e as Error).message}`);
    }
  };
}
