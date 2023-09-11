import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../types/Settings';
import {ChainsIds} from '../types/ChainsIds';
import {BlockchainRepository} from './BlockchainRepository';
import {StakingBankContract} from '../contracts/evm/StakingBankContract';
import {StakingBankInterface} from '../contracts/interfaces/StakingBankInterface';

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
            ? new StakingBankContract(blockchain)
            : undefined;
      } catch (e) {
        this.collection[chainId] = undefined;
        logger.error(`[${chainId}] ${e.message}`);
      }
    });
  }

  get(id: string): StakingBankContract {
    if (!this.collection[id]) {
      console.warn(`[StakingBankContractRepository] Blockchain ${id} does not exists`);
    }

    return <StakingBankContract>this.collection[id];
  }
}
