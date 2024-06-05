import {inject, injectable} from 'inversify';

import {LoopAgent} from './LoopAgent.js';
import {GraphClient} from '../services/graph/GraphClient.js';
import Settings from '../types/Settings.js';
import logger from '../lib/logger.js';
import {SovrynPoolRepository} from '../services/dexes/sovryn/SovrynPoolRepository.js';
import {SovrynPoolScanner} from '../services/dexes/sovryn/SovrynPoolScanner.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {DexProtocolName} from '../types/Dexes.js';

@injectable()
export class SovrynPoolScannerAgent extends LoopAgent {
  backoffTime = 10000;

  scanner: SovrynPoolScanner;
  dexes: Settings['dexes'];

  constructor(@inject('Settings') settings: Settings) {
    super();
    const poolReposity = new SovrynPoolRepository();
    const graphClient = new GraphClient();
    this.scanner = new SovrynPoolScanner(graphClient, poolReposity, logger);
    this.dexes = settings.dexes;
  }

  async execute(): Promise<void> {
    const promises = [];

    for (const [chainId, dexes] of Object.entries(this.dexes)) {
      if (dexes[DexProtocolName.SOVRYN]) {
        const {subgraphUrl} = dexes[DexProtocolName.SOVRYN];

        const promise = this.scanner.run(chainId as ChainsIds, subgraphUrl).then((success) => {
          if (success) {
            this.logger.info(`[SovrynPoolScannerAgent][${chainId}] Synchronized. Waiting...`);
          } else {
            this.logger.error(`[SovrynPoolScannerAgent][${chainId}] Pool scan failed. Waiting...`);
          }
        });

        promises.push(promise);
      }
    }

    await Promise.all(promises);

    this.sleep(this.backoffTime);
  }
}
