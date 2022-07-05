import {inject, injectable} from 'inversify';

import Settings from '../types/Settings';
import {ChainsIds} from '../types/ChainsIds';
import ChainContract from '../contracts/ChainContract';
import {BlockchainRepository} from './BlockchainRepository';

export type ChainContractCollection = {
  [key: string]: ChainContract | undefined;
};

@injectable()
export class ChainContractRepository {
  private collection: ChainContractCollection = {};

  constructor(
    @inject('Settings') settings: Settings,
    @inject(BlockchainRepository) blockchainRepository: BlockchainRepository,
  ) {
    Object.values(ChainsIds).forEach((chainId) => {
      const blockchain = blockchainRepository.get(chainId);

      this.collection[chainId] =
        blockchain.provider && blockchain.getContractRegistryAddress()
          ? new ChainContract(settings, blockchain)
          : undefined;
    });
  }

  get(id: string): ChainContract {
    if (!this.collection[id]) {
      console.warn(`[ChainContractRepository] Blockchain ${id} does not exists`);
    }

    return <ChainContract>this.collection[id];
  }
}
