import {inject, injectable} from 'inversify';

import Settings, {BlockchainType} from '../types/Settings';
import {ChainsIds, NonEvmChainsIds} from '../types/ChainsIds';
import ChainContract from '../contracts/ChainContract';
import {BlockchainRepository} from './BlockchainRepository';
import {IGenericChainContract} from 'src/contracts/generic/IGenericChainContract';
import {Logger} from 'winston';

export type ChainContractCollection = {
  [key: string]: ChainContract | IGenericChainContract | undefined;
};

@injectable()
export class ChainContractRepository {
  private collection: ChainContractCollection = {};

  constructor(
    @inject('Settings') settings: Settings,
    @inject('Logger') logger: Logger,
    @inject(BlockchainRepository) blockchainRepository: BlockchainRepository,
  ) {
    const keys = Object.keys(settings.blockchain.multiChains) as ChainsIds[];

    keys.forEach((chainId) => {
      if (!settings.blockchain.multiChains[chainId]?.type.includes(BlockchainType.LAYER2)) {
        console.warn(`[ChainContractRepository] Blockchain ${chainId} is not ${BlockchainType.LAYER2}`);
        this.collection[chainId] = undefined;
        return;
      }

      try {
        const blockchain = blockchainRepository.get(chainId);

        this.collection[chainId] =
          blockchain.provider && blockchain.getContractRegistryAddress()
            ? new ChainContract(settings, blockchain)
            : undefined;
      } catch (e) {
        this.collection[chainId] = undefined;
        logger.error(`[${chainId}] ${e.message}`);
      }
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
