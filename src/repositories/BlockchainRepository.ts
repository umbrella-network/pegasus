import {inject, injectable} from 'inversify';

import Blockchain from '../lib/Blockchain';
import {BlockchainFactory} from '../factories/BlockchainFactory';
import Settings from '../types/Settings';
import {ChainsIds} from '../types/ChainsIds';

export type BlockchainCollection = {
  [key: string]: Blockchain;
};

@injectable()
export class BlockchainRepository {
  @inject('Settings') settings!: Settings;
  private collection: BlockchainCollection = {};

  constructor(@inject('Settings') settings: Settings) {
    Object.values(ChainsIds).forEach((chainId) => {
      this.collection[chainId] = BlockchainFactory.create({chainId, settings});
    });
  }

  get(id: string): Blockchain {
    if (!this.collection[id]) {
      throw Error(`[BlockchainRepository] Blockchain ${id} does not exists`);
    }

    return <Blockchain>this.collection[id];
  }
}
