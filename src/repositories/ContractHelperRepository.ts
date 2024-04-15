import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../types/Settings.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {ContractHelperFactory} from '../factories/ContractHelperFactory.js';
import {DexProtocolName} from '../types/DexProtocolName.js';
import {ContractHelperInterface} from '../services/fetcherHelper/interfaces/ContractHelperInterface.js';

export type ContractHelperCollection = {
  [key: string]: {
    [key: string]: ContractHelperInterface | undefined;
  };
};

@injectable()
export class ContractHelperRepository {
  @inject('Settings') settings!: Settings;

  logger!: Logger;
  private collection: ContractHelperCollection = {};

  constructor(@inject('Settings') settings: Settings, @inject('Logger') logger: Logger) {
    this.logger = logger;
    let logPrefix;
    const keys = Object.keys(settings.dexes) as ChainsIds[];
    keys.forEach((chainId) => {
      const dexProtocolKey = Object.keys(settings.dexes[chainId]!) as DexProtocolName[];

      dexProtocolKey.forEach((dexProtocol) => {
        logPrefix = `[ContractHelperRepository][${chainId}][${dexProtocol}]`;

        try {
          this.collection[chainId] ||= {};
          this.collection[chainId][dexProtocol] = ContractHelperFactory.create(chainId, dexProtocol);
          logger.info(`${logPrefix} contract helper ready`);
        } catch (e: unknown) {
          logger.error(`${logPrefix} ${(e as Error).message}`);
          this.collection[chainId][dexProtocol] = undefined;
        }
      });
    });
  }

  get(chainId: ChainsIds, dexProtocol: DexProtocolName): ContractHelperInterface {
    const logPrefix = `[ContractHelperRepository][${chainId}][${dexProtocol}]`;

    if (!this.collection[chainId]?.[dexProtocol]) {
      throw Error(`${logPrefix} contract helper does not exist`);
    }

    return this.collection[chainId][dexProtocol]!;
  }
}
