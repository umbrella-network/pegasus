import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings, {BlockchainType} from '../types/Settings.js';
import {ChainsIds, NonEvmChainsIds} from '../types/ChainsIds.js';
import ChainContract from '../blockchains/evm/contracts/ChainContract.js';
import {BlockchainRepository} from './BlockchainRepository.js';

export type ChainContractCollection = {
  [key: string]: ChainContract | undefined;
};

@injectable()
export class ChainContractRepository {
  private collection: ChainContractCollection = {};
  private logger: Logger;

  constructor(
    @inject('Settings') settings: Settings,
    @inject('Logger') logger: Logger,
    @inject(BlockchainRepository) blockchainRepository: BlockchainRepository,
  ) {
    this.logger = logger;
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
      } catch (e: unknown) {
        this.collection[chainId] = undefined;
        logger.error(`[${chainId}] ${(e as Error).message}`);
      }
    });
  }

  get(id: string): ChainContract {
    if (!this.collection[id]) {
      this.logger.error(`[ChainContractRepository] Blockchain ${id} does not exists`);
    }

    return <ChainContract>this.collection[id];
  }

  getGeneric(id: string): ChainContract {
    if (!this.collection[id]) {
      throw Error(`[ChainContractRepository] Blockchain ${id} does not exists`);
    }

    if (!NonEvmChainsIds.includes(<ChainsIds>id)) {
      throw Error(`[ChainContractRepository] Wrong Blockchain type for ${id}. Expected GenericBlockchain`);
    }

    return <ChainContract>this.collection[id];
  }
}
