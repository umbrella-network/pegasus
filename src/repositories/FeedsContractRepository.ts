import {inject, injectable} from 'inversify';

import Settings, {BlockchainType} from '../types/Settings.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {BlockchainRepository} from './BlockchainRepository.js';
import {Logger} from 'winston';
import {FeedContract} from '../blockchains/evm/contracts/FeedContract.js';
import {UmbrellaFeedsContractFactory} from '../factories/contracts/UmbrellaFeedsContractFactory.js';
import {UmbrellaFeedInterface} from '../interfaces/UmbrellaFeedInterface.js';

export type FeedsContractCollection = {
  [key: string]: UmbrellaFeedInterface | undefined;
};

@injectable()
export class FeedsContractRepository {
  private collection: FeedsContractCollection = {};
  private logger: Logger;

  constructor(
    @inject('Settings') settings: Settings,
    @inject('Logger') logger: Logger,
    @inject(BlockchainRepository) blockchainRepository: BlockchainRepository,
  ) {
    this.logger = logger;
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
            ? UmbrellaFeedsContractFactory.create(blockchain)
            : undefined;
      } catch (e: unknown) {
        this.collection[chainId] = undefined;
        logger.error(`[${chainId}] ${(e as Error).message}`);
      }
    });
  }

  get(id: string): FeedContract {
    if (!this.collection[id]) {
      this.logger.error(`[FeedsContractRepository] Blockchain ${id} does not exists`);
    }

    return <FeedContract>this.collection[id];
  }
}
