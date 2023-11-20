import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../types/Settings.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {DeviationSignerInterface} from '../services/deviationsFeeds/interfaces/DeviationSignerInterface.js';
import {DeviationSignerFactory} from '../factories/DeviationSignerFactory.js';

export type DeviationSignerCollection = {
  [key: string]: DeviationSignerInterface | undefined;
};

@injectable()
export class DeviationSignerRepository {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  private collection: DeviationSignerCollection = {};

  constructor(@inject('Settings') settings: Settings, @inject('Logger') logger: Logger) {
    const keys = Object.keys(settings.blockchain.multiChains) as ChainsIds[];

    keys.forEach((chainId) => {
      try {
        this.collection[chainId] = DeviationSignerFactory.create(settings, chainId);
      } catch (e: unknown) {
        logger.error(`[DeviationSignerRepository] ${chainId}: ${(e as Error).message}`);
        this.collection[chainId] = undefined;
      }
    });
  }

  get(id: string): DeviationSignerInterface {
    if (!this.collection[id]) {
      this.logger.warn(`[DeviationSignerRepository] DeviationSignerInterface ${id} does not exists`);
    }

    return <DeviationSignerInterface>this.collection[id];
  }
}
