import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {BasicAgent} from './BasicAgent.js';
import {UniswapPriceScanner} from '../services/uniswap/UniswapPriceScanner.js';

@injectable()
export class UniswapPriceScannerAgent extends BasicAgent {
  @inject('Logger') logger!: Logger;
  @inject(UniswapPriceScanner) scanner!: UniswapPriceScanner;

  async start(): Promise<void> {
    this.logger.info('[UniswapPriceScannerAgent] Starting...');
    await this.scanner.start();
  }
}
