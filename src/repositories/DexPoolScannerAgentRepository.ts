import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ChainsIds} from '../types/ChainsIds.js';
import {DexProtocolName} from '../types/DexProtocolName.js';
import {DexPoolScannerAgentFactory} from '../factories/DexPoolScannerAgentFactory.js';
import {DexPoolScannerAgent} from '../agents/DexPoolScannerAgent.js';
import Settings from '../types/Settings.js';

export type DexPoolScannerAgentCollection = {
  [key: string]: {
    [key: string]: DexPoolScannerAgent | undefined;
  };
};

@injectable()
export class DexPoolScannerAgentRepository {
  private collection: DexPoolScannerAgentCollection = {};

  constructor(@inject('Settings') settings: Settings, @inject('Logger') logger: Logger) {
    let logPrefix;
    const keys = Object.keys(settings.dexes) as ChainsIds[];

    keys.forEach((chainId) => {
      const dexProtocolKey = Object.keys(settings.dexes[chainId]!) as DexProtocolName[];

      dexProtocolKey.forEach((dexProtocol) => {
        logPrefix = `[DexPoolScannerAgentRepository][${chainId}][${dexProtocol}]`;

        try {
          this.collection[chainId] ||= {};
          this.collection![chainId][dexProtocol] = DexPoolScannerAgentFactory.create(chainId, dexProtocol);
          logger.info(`${logPrefix} scanner agent ready`);
        } catch (e: unknown) {
          logger.error(`${logPrefix} ${(e as Error).message}`);
          this.collection[chainId][dexProtocol] = undefined;
        }
      });
    });
  }

  get(chainId: ChainsIds, dexProtocol: DexProtocolName): DexPoolScannerAgent {
    const logPrefix = `[DexPoolScannerAgentRepository][${chainId}][${dexProtocol}]`;

    if (!this.collection[chainId]?.[dexProtocol]) {
      throw Error(`${logPrefix} scanner agent does not exist`);
    }

    return this.collection[chainId][dexProtocol]!;
  }
}
