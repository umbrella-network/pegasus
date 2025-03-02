import {inject, injectable} from 'inversify';
import UniswapV3LiquidityWorker from '../workers/UniswapV3LiquidityWorker.js';
import BasicWorker from '../workers/BasicWorker.js';
import {DexProtocolName} from '../types/Dexes.js';
import {LogPrinter} from '../services/tools/LogPrinter.js';

@injectable()
export class LiquidityWorkerRepository extends LogPrinter {
  readonly collection: {[key: string]: BasicWorker};

  constructor(@inject(UniswapV3LiquidityWorker) UniswapV3LiquidityWorker: UniswapV3LiquidityWorker) {
    super();

    this.logPrefix = '[LiquidityWorkerRepository]';

    this.collection = {
      [DexProtocolName.UNISWAP_V3]: UniswapV3LiquidityWorker,
    };
  }

  find(protocol: DexProtocolName): BasicWorker | undefined {
    if (!this.collection[protocol]) {
      this.logger.warn(`[${this.logPrefix}] No worker for protocol ${protocol}`);
    }

    return this.collection[protocol];
  }
}
