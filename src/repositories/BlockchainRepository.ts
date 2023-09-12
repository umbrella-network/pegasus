import {inject, injectable} from 'inversify';

import Blockchain from '../lib/Blockchain';
import Settings from '../types/Settings';
import {ChainsIds} from '../types/ChainsIds';
import {Logger} from 'winston';

export type BlockchainCollection = {
  [key: string]: Blockchain;
};

@injectable()
export class BlockchainRepository {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  private collection: BlockchainCollection = {};

  constructor(@inject('Settings') settings: Settings) {
    const keys = Object.keys(settings.blockchain.multiChains) as ChainsIds[];

    keys.forEach((chainId) => {
      this.collection[chainId] = new Blockchain(settings, chainId);
    });
  }

  get(id: string): Blockchain {
    if (!this.collection[id]) {
      this.logger.warn(`[BlockchainRepository] Blockchain ${id} does not exists`);
    }

    return <Blockchain>this.collection[id];
  }
}
