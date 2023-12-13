import {inject, injectable} from 'inversify';

import Settings from '../types/Settings.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {Logger} from 'winston';
import {ProviderInterface} from '../interfaces/ProviderInterface.js';
import {ProviderFactory} from '../factories/ProviderFactory.js';

export type ProviderCollection = {
  [key: string]: ProviderInterface | undefined;
};

@injectable()
export class ProviderRepository {
  logger!: Logger;
  private collection: ProviderCollection = {};

  constructor(@inject('Settings') settings: Settings, @inject('Logger') logger: Logger) {
    this.logger = logger;
    const keys = Object.keys(settings.blockchain.multiChains) as ChainsIds[];

    keys.forEach((chainId) => {
      try {
        this.collection[chainId] = ProviderFactory.create(chainId);
      } catch (e: unknown) {
        logger.warn(`[ProviderRepository] ${(e as Error).message}`);
        this.collection[chainId] = undefined;
      }
    });
  }

  get(id: string): ProviderInterface {
    if (!this.collection[id]) {
      this.logger.error(`[ProviderRepository] IProvider ${id} does not exists`);
    }

    return <ProviderInterface>this.collection[id];
  }
}
