import {inject, injectable} from 'inversify';
import {UniswapPoolScanner} from '../services/uniswap/UniswapPoolScanner';
import {LoopAgent} from './LoopAgent';
import {UniswapPoolService} from '../services/uniswap/UniswapPoolService';

@injectable()
export class UniswapPoolScannerAgent extends LoopAgent {
  backoffTime = 10000;
  interval = 100;

  @inject(UniswapPoolScanner) scanner!: UniswapPoolScanner;
  @inject(UniswapPoolService) poolService!: UniswapPoolService;

  async execute(): Promise<void> {
    const result = await this.scanner.run();

    if (!result.success) {
      this.logger.error('[UniswapPoolScannerAgent] Pool scan failed. Waiting...');
      this.sleep(this.backoffTime);
    } else if (result.synchronized) {
      this.logger.info('[UniswapPoolScannerAgent] Synchronized. Waiting...');
      this.sleep(this.backoffTime);
    }
  }

  async onStart(): Promise<void> {
    this.logger.info('[UniswapPoolScannerAgent] Updating Pool Verification Status');
    await this.poolService.updatePoolVerificationStatus();
    this.logger.info('[UniswapPoolScannerAgent] Starting Uniswap Pool Scanner.');
  }
}
