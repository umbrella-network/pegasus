import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../types/Settings.js';
import {ChainsIds} from '../types/ChainsIds.js';
import {BlockchainRepository} from './BlockchainRepository.js';
import {StakingBankContract} from '../blockchains/evm/contracts/StakingBankContract.js';
import {StakingBankInterface} from '../interfaces/StakingBankInterface.js';
import {StakingBankContractFactory} from '../factories/contracts/StakingBankContractFactory.js';

export type BankContractCollection = {
  [key: string]: StakingBankInterface | undefined;
};

@injectable()
export class StakingBankContractRepository {
  private collection: BankContractCollection = {};

  constructor(
    @inject('Settings') settings: Settings,
    @inject('Logger') logger: Logger,
    @inject(BlockchainRepository) blockchainRepository: BlockchainRepository,
  ) {
    const keys = Object.keys(settings.blockchain.multiChains) as ChainsIds[];

    keys.forEach((chainId) => {
      try {
        const blockchain = blockchainRepository.get(chainId);

        this.collection[chainId] =
          blockchain.provider && blockchain.getContractRegistryAddress()
            ? StakingBankContractFactory.create(blockchain)
            : undefined;
      } catch (e: unknown) {
        this.collection[chainId] = undefined;
        logger.error(`[${chainId}] ${(e as Error).message}`);
      }
    });
  }

  get(id: string): StakingBankInterface {
    if (!this.collection[id]) {
      console.warn(`[StakingBankContractRepository] Blockchain ${id} does not exists`);
    }

    return <StakingBankContract>this.collection[id];
  }
}
