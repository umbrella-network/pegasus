import {inject, injectable} from 'inversify';

import Settings, {BlockchainType} from '../types/Settings';
import {ChainsIds} from '../types/ChainsIds';
import {BlockchainRepository} from './BlockchainRepository';
import {Logger} from 'winston';
import {FeedContract} from '../contracts/FeedContract';

export type FeedsContractCollection = {
  [key: string]: FeedContract | undefined;
};

@injectable()
export class FeedsContractRepository {
  private collection: FeedsContractCollection = {};

  constructor(
    @inject('Settings') settings: Settings,
    @inject('Logger') logger: Logger,
    @inject(BlockchainRepository) blockchainRepository: BlockchainRepository,
  ) {
    const keys = Object.keys(settings.blockchain.multiChains) as ChainsIds[];

    keys.forEach((chainId) => {
      if (!settings.blockchain.multiChains[chainId]?.type.includes(BlockchainType.ON_CHAIN)) {
        console.warn(`[FeedsContractCollection] Blockchain ${chainId} is not ${BlockchainType.ON_CHAIN}`);
        this.collection[chainId] = undefined;
        return;
      }

      try {
        const blockchain = blockchainRepository.get(chainId);

        this.collection[chainId] =
          blockchain.provider && blockchain.getContractRegistryAddress()
            ? new FeedContract(settings, blockchain)
            : undefined;
      } catch (e) {
        this.collection[chainId] = undefined;
        logger.error(`[${chainId}] ${e.message}`);
      }
    });
  }

  get(id: string): FeedContract {
    if (!this.collection[id]) {
      console.warn(`[FeedsContractRepository] Blockchain ${id} does not exists`);
    }

    return <FeedContract>this.collection[id];
  }
}
