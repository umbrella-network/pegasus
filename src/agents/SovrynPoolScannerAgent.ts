import {SovrynPoolRepository} from 'src/services/sovryn/SovrynPoolRepository.js';
import {SovrynPoolScanner} from '../services/sovryn/SovrynPoolScanner.js';
import {LoopAgent} from './LoopAgent.js';
import {GraphClient} from 'src/services/graph/GraphClient.js';

export class SovrynPoolScannerAgent extends LoopAgent {
  backoffTime = 10000;

  scanner: SovrynPoolScanner;

  constructor() {
    super();
    const poolReposity = new SovrynPoolRepository();
    const graphClient = new GraphClient();
    this.scanner = new SovrynPoolScanner(graphClient, poolReposity);
  }

  async execute(): Promise<void> {
    const success = await this.scanner.run();

    if (success) {
      this.logger.info('[SovrynPoolScannerAgent] Synchronized. Waiting...');
      this.sleep(this.backoffTime);
    } else {
      this.logger.error('[SovrynPoolScannerAgent] Pool scan failed. Waiting...');
      this.sleep(this.backoffTime);
    }
  }
}
