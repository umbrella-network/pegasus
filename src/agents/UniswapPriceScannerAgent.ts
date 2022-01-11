import {inject, injectable} from 'inversify';
import {BasicAgent} from './BasicAgent';
import {Logger} from 'winston';
import {UniswapPriceScanner} from '../services/uniswap/UniswapPriceScanner';

@injectable()
export class UniswapPriceScannerAgent extends BasicAgent {
  @inject('Logger') logger!: Logger;
  @inject(UniswapPriceScanner) scanner!: UniswapPriceScannerAgent;

  async start(): Promise<void> {
    this.logger.info('[UniswapPriceScannerAgent] Starting...');
    await this.scanner.start();
  }
}
