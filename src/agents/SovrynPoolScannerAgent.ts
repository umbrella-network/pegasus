import {inject, injectable} from 'inversify';

import {SovrynPoolRepository} from '../services/sovryn/SovrynPoolRepository.js';
import {SovrynPoolScanner} from '../services/sovryn/SovrynPoolScanner.js';
import {LoopAgent} from './LoopAgent.js';
import {GraphClient} from '../services/graph/GraphClient.js';
import Settings from '../types/Settings.js';
import logger from '../lib/logger.js';
import {ChainsIds} from 'src/types/ChainsIds.js';

@injectable()
export class SovrynPoolScannerAgent extends LoopAgent {
  backoffTime = 10000;

  scanner: SovrynPoolScanner;
  subgraphUrls: Partial<Record<ChainsIds, {subgraphUrl: string}>>;

  constructor(@inject('Settings') settings: Settings) {
    super();
    const poolReposity = new SovrynPoolRepository();
    const graphClient = new GraphClient();
    this.scanner = new SovrynPoolScanner(graphClient, poolReposity, logger);
    this.subgraphUrls = settings.api.sovryn;
  }

  async execute(): Promise<void> {
    for (const [chainId, {subgraphUrl}] of Object.entries(this.subgraphUrls)) {
      const success = await this.scanner.run(chainId as ChainsIds, subgraphUrl);

      if (success) {
        this.logger.info(`[SovrynPoolScannerAgent][${chainId}] Synchronized. Waiting...`);
      } else {
        this.logger.error(`[SovrynPoolScannerAgent][${chainId}] Pool scan failed. Waiting...`);
      }
    }

    this.sleep(this.backoffTime);
  }
}
