import {injectable} from 'inversify';
import {Logger} from 'winston';

import {LoopAgent} from './LoopAgent.js';
import {DexPoolScanner} from '../services/DexPoolScanner.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {DexProtocolName} from '../types/DexProtocolName.js';
import Application from '../lib/Application.js';
import Settings from '../types/Settings.js';
import {DexPoolScannerRepository} from '../repositories/DexPoolScannerRepository.js';

@injectable()
export class DexPoolScannerAgent extends LoopAgent {
  readonly backoffTime: number;
  readonly interval: number;
  readonly stepInterval: number;
  readonly dexPoolScanner: DexPoolScanner;
  readonly settings: Settings;
  readonly logger: Logger;
  logPrefix = '';

  constructor(chainId: ChainsIds, dexProtocol: DexProtocolName) {
    super();
    this.settings = Application.get('Settings');
    this.logger = Application.get('Logger');
    const dexPoolScannerRepository = Application.get(DexPoolScannerRepository);
    this.backoffTime = this.settings.dexes[chainId]?.[dexProtocol]?.backoffTime || 1000;
    this.interval = this.settings.dexes[chainId]?.[dexProtocol]?.interval || 1000;
    this.dexPoolScanner = dexPoolScannerRepository.get(chainId, dexProtocol);
    this.logPrefix = `[DexPoolScannerAgent][${chainId}][${dexProtocol}]`;

    this.stepInterval =
      (this.settings.dexes[chainId]?.[dexProtocol]?.blockTime || 1000) *
      (this.settings.dexes[chainId]?.[dexProtocol]?.agentStep || 5000);
  }

  async execute(): Promise<void> {
    const result = await this.dexPoolScanner.run();

    if (!result.success && !result.waitBlockRange) {
      this.logger.error(`${this.logPrefix} Pool scan failed. Waiting...`);
      this.sleep(this.backoffTime);
    } else if (result.waitBlockRange) {
      this.logger.info(`${this.logPrefix} Latest block is not minted. Waiting ${this.stepInterval}ms`);
      this.sleep(this.stepInterval);
    }
  }
}
