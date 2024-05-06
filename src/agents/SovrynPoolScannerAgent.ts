import {inject, injectable} from 'inversify';

import {SovrynPoolScanner} from '../services/sovryn/SovrynPoolScanner.js';
import {LoopAgent} from './LoopAgent.js';

@injectable()
export class SovrynPoolScannerAgent extends LoopAgent {
  backoffTime = 10000;
  interval = 100;

  @inject(SovrynPoolScanner) scanner!: SovrynPoolScanner;

  async execute(): Promise<void> {
    const result = await this.scanner.run();

    if (!result.success) {
      this.logger.error('[SovrynPoolScannerAgent] Pool scan failed. Waiting...');
      this.sleep(this.backoffTime);
    } else if (result.synchronized) {
      this.logger.info('[SovrynPoolScannerAgent] Synchronized. Waiting...');
      this.sleep(this.backoffTime);
    }
  }
}
