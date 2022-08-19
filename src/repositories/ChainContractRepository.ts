import {inject, injectable} from 'inversify';

import Settings from '../types/Settings';
import {ChainsIds, NonEvmChainsIds} from '../types/ChainsIds';
import ChainContract from '../contracts/ChainContract';
import {BlockchainRepository} from './BlockchainRepository';
import {IGenericChainContract} from 'src/contracts/generic/IGenericChainContract';

export type ChainContractCollection = {
  [key: string]: ChainContract | IGenericChainContract | undefined;
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

  getGeneric(id: string): IGenericChainContract {
    if (!this.collection[id]) {
      throw Error(`[ChainContractRepository] Blockchain ${id} does not exists`);
    }

    if (!NonEvmChainsIds.includes(<ChainsIds>id)) {
      throw Error(`[ChainContractRepository] Wrong Blockchain type for ${id}. Expected GenericBlockchain`);
    }

    return <IGenericChainContract>this.collection[id];
  }
}
