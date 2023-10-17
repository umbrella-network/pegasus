import {inject, injectable} from 'inversify';

import Settings from '../types/Settings';
import {ChainsIds} from '../types/ChainsIds';
import {Logger} from 'winston';
import {ProviderInterface} from '../interfaces/ProviderInterface';
import {ProviderFactory} from '../factories/ProviderFactory';

export type ProviderCollection = {
  [key: string]: ProviderInterface;
};

@injectable()
export class ProviderRepository {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  private collection: ProviderCollection = {};

  constructor(@inject('Settings') settings: Settings) {
    const keys = Object.keys(settings.blockchain.multiChains) as ChainsIds[];

    keys.forEach((chainId) => {
      this.collection[chainId] = ProviderFactory.create(chainId);
    });
  }

  get(id: string): ProviderInterface {
    if (!this.collection[id]) {
      this.logger.warn(`[ProviderRepository] IProvider ${id} does not exists`);
    }

    return <ProviderInterface>this.collection[id];
  }
}
