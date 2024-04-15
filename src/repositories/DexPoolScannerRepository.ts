import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ChainsIds} from '../types/ChainsIds.js';
import {DexProtocolName} from '../types/DexProtocolName.js';
import Settings from '../types/Settings.js';
import {DexPoolScanner} from '../services/DexPoolScanner.js';
import {DexPoolScannerFactory} from '../factories/DexPoolScannerFactory.js';

export type DexPoolScannerCollection = {
  [key: string]: {
    [key: string]: DexPoolScanner | undefined;
  };
};

@injectable()
export class DexPoolScannerRepository {
  private collection: DexPoolScannerCollection = {};

  constructor(@inject('Settings') settings: Settings, @inject('Logger') logger: Logger) {
    let logPrefix;
    const keys = Object.keys(settings.dexes) as ChainsIds[];

    keys.forEach((chainId) => {
      const dexProtocolKey = Object.keys(settings.dexes[chainId]!) as DexProtocolName[];

      dexProtocolKey.forEach((dexProtocol) => {
        logPrefix = `[DexPoolScannerRepository][${chainId}][${dexProtocol}]`;

        try {
          this.collection[chainId] ||= {};
          this.collection![chainId][dexProtocol] = DexPoolScannerFactory.create(chainId, dexProtocol);
          logger.info(`${logPrefix} scanner ready`);
        } catch (e: unknown) {
          logger.error(`${logPrefix} ${(e as Error).message}`);
          this.collection[chainId][dexProtocol] = undefined;
        }
      });
    });
  }

  get(chainId: ChainsIds, dexProtocol: DexProtocolName): DexPoolScanner {
    const logPrefix = `[DexPoolScannerRepository][${chainId}][${dexProtocol}]`;

    if (!this.collection[chainId]?.[dexProtocol]) {
      throw Error(`${logPrefix} scanner does not exist`);
    }

    return this.collection[chainId][dexProtocol]!;
  }
}
