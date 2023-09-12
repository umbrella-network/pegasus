import {ethers} from 'ethers';
import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import {BlockchainRepository} from '../repositories/BlockchainRepository';
import {ChainContractRepository} from '../repositories/ChainContractRepository';
import {ChainsIds, NonEvmChainsIds} from '../types/ChainsIds';
import Settings from '../types/Settings';

@injectable()
export class MultichainArchitectureDetector {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(ChainContractRepository) chainContractRepository!: ChainContractRepository;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

  async apply(chainId: ChainsIds): Promise<boolean> {
    const nonEvm = NonEvmChainsIds.includes(chainId);

    if (nonEvm) {
      // when non evm start to support dispatching, simply remove this check
      return false;
    }

    try {
      const blockchain = this.blockchainRepository.get(chainId);

      const contract = nonEvm
        ? this.chainContractRepository.getGeneric(chainId)
        : this.chainContractRepository.get(chainId);

      let address = await contract.address();

      if (!address) {
        await contract.resolveContract();
        address = await contract.address();
      }

      const data = ethers.utils.id('VERSION()').slice(0, 10);

      const provider = await blockchain.getProvider();
      const version = await provider.call({to: address, data});
      const versionWithDispatcher = 2;
      return parseInt(version.toString(), 16) == versionWithDispatcher;
    } catch (err) {
      this.logger.error(`[${chainId}] [MultichainArchitectureDetector] check version failed: ${err}`);
      return false;
    }
  }
}
