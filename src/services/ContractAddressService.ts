import {inject, injectable} from 'inversify';
import {BaseProvider} from '@ethersproject/providers';
import {Contract} from 'ethers';

import {BlockchainRepository} from '../repositories/BlockchainRepository.js';
import {RegistryContractFactory} from '../factories/contracts/RegistryContractFactory.js';
import {ChainsIds} from '../types/ChainsIds';

@injectable()
export class ContractAddressService {
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

  async getContract(chainId: ChainsIds, address: string, abi: string) {
    const blockchain = this.blockchainRepository.get(chainId);
    const registry = RegistryContractFactory.create(blockchain);
    const contractAddress = await registry.getAddress(address);

    const provider = blockchain.provider.getRawProviderSync<BaseProvider>();
    const contract = new Contract(contractAddress, abi, provider);

    return contract;
  }
}
