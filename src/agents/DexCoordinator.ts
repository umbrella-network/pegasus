import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../types/Settings.js';
import {DexPoolScannerAgentRepository} from '../repositories/DexPoolScannerAgentRepository.js';
import {DexProtocolName} from '../types/DexProtocolName.js';
import {ChainsIds} from '../types/ChainsIds.js';

@injectable()
export class DexCoordinator {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(DexPoolScannerAgentRepository) dexPoolScannerAgentRepository!: DexPoolScannerAgentRepository;

  logPrefix: string = '';

  async startOne(chainId: ChainsIds, dexProtocol: DexProtocolName): Promise<void> {
    this.logPrefix = `[DexCoordinator][${chainId}][${dexProtocol}]`;

    if (!this.validateGeneralSettings()) {
      return;
    }

    if (dexProtocol && chainId) {
      const dexScanner = this.dexPoolScannerAgentRepository.get(chainId, dexProtocol);

      if (!dexScanner) {
        this.logger.error(`${this.logPrefix} scanner not found.`);
        return;
      }

      this.logger.info(`${this.logPrefix} Starting scanner`);

      await dexScanner.start();

      return;
    }
  }

  async start(): Promise<void> {
    if (!this.validateGeneralSettings()) {
      return;
    }

    for (const chainId of Object.keys(this.settings.dexes)) {
      this.logPrefix = `[DexCoordinator][${chainId}]`;

      if (!this.validateChainSettings(chainId as ChainsIds)) {
        continue;
      }

      for (const dexProtocol of Object.keys(this.settings.dexes[chainId as ChainsIds]!)) {
        if (!this.validateAgentSettings(chainId as ChainsIds, dexProtocol as DexProtocolName)) {
          continue;
        }

        const dexAgentScanner = this.dexPoolScannerAgentRepository.get(
          chainId as ChainsIds,
          dexProtocol as DexProtocolName,
        );

        if (!dexAgentScanner) {
          this.logger.warn(`${this.logPrefix}[${dexProtocol}] agent scanner does not exist, skipping.`);
          continue;
        }

        this.logger.info(`${this.logPrefix}[${chainId}][${dexProtocol}] Starting agent scanner`);

        dexAgentScanner.start();
      }
    }
  }

  private validateGeneralSettings() {
    if (Object.keys(this.settings.dexes).length === 0) {
      this.logger.warn(`${this.logPrefix} scanner list empty.`);
      return false;
    }

    return true;
  }

  private validateChainSettings(chainId: ChainsIds) {
    if (!this.settings.dexes[chainId]) {
      this.logger.warn(`${this.logPrefix} chain setting does not exist, skipping.`);
      return false;
    }

    return true;
  }

  private validateAgentSettings(chainId: ChainsIds, dexProtocol: DexProtocolName) {
    if (!this.settings.dexes[chainId]?.[dexProtocol]?.active) {
      this.logger.warn(`${this.logPrefix}[${dexProtocol}] agent scanner is not valid, skipping.`);
      return false;
    }

    return true;
  }
}
