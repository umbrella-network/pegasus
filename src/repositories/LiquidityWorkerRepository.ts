import {inject, injectable} from 'inversify';
import UniswapV3LiquidityWorker from '../workers/UniswapV3LiquidityWorker.js';
import BasicWorker from '../workers/BasicWorker.js';
import {DexProtocolName} from '../types/Dexes.js';

@injectable()
export class LiquidityWorkerRepository {
  readonly collection: {[key: string]: BasicWorker};

  constructor(@inject(UniswapV3LiquidityWorker) UniswapV3LiquidityWorker: UniswapV3LiquidityWorker) {
    this.collection = {
      [DexProtocolName.UNISWAP_V3]: UniswapV3LiquidityWorker,
    };
  }

  find(protocol: DexProtocolName): BasicWorker | undefined {
    return this.collection[protocol];
  }
}
