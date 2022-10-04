import {inject, injectable} from 'inversify';

import Blockchain from '../lib/Blockchain';
import {IGenericBlockchain} from '../lib/blockchains/IGenericBlockchain';
import {BlockchainFactory} from '../factories/BlockchainFactory';
import Settings from '../types/Settings';
import {ChainsIds, NonEvmChainsIds} from '../types/ChainsIds';

export type BlockchainCollection = {
  [key: string]: Blockchain | IGenericBlockchain;
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

  getGeneric(id: string): IGenericBlockchain {
    if (!this.collection[id]) {
      throw Error(`[BlockchainRepository] Blockchain ${id} does not exists`);
    }

    if (!NonEvmChainsIds.includes(<ChainsIds>id)) {
      throw Error(`[BlockchainRepository] Wrong Blockchain type for ${id}. Expected GenericBlockchain`);
    }

    return <IGenericBlockchain>this.collection[id];
  }
}
