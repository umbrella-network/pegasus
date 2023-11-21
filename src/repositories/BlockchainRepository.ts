import {inject, injectable} from 'inversify';

import Blockchain from '../lib/Blockchain.js';
import Settings from '../types/Settings.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {Logger} from 'winston';

export type BlockchainCollection = {
  [key: string]: Blockchain | undefined;
};

@injectable()
export class BlockchainRepository {
  logger!: Logger;
  private collection: BlockchainCollection = {};

  constructor(@inject('Settings') settings: Settings, @inject('Logger') logger: Logger) {
    const keys = Object.keys(settings.blockchain.multiChains) as ChainsIds[];
    this.logger = logger;

    keys.forEach((chainId) => {
      try {
        this.collection[chainId] = new Blockchain(settings, chainId);
      } catch (e: unknown) {
        logger.warn(`[BlockchainRepository] ${(e as Error).message}`);
        this.collection[chainId] = undefined;
      }
    });
  }

  get(id: string): Blockchain {
    if (!this.collection[id]) {
      this.logger.error(`[BlockchainRepository] Blockchain ${id} does not exists`);
    }

    return <Blockchain>this.collection[id];
  }
}
