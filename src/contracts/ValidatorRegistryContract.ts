import {inject, injectable} from 'inversify';
import {BigNumber, Contract} from 'ethers';
import {ABI, ContractRegistry} from '@umb-network/toolbox';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import {Validator} from '../types/Validator';

@injectable()
class ValidatorRegistryContract {
  readonly settings!: Settings;
  readonly blockchain!: Blockchain;
  registry!: ContractRegistry;

  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    this.settings = settings;
    this.blockchain = blockchain;
  }

  async getAddress(): Promise<string> {
    return (await this.resolveContract()).address;
  }

  async getValidators(): Promise<Validator[]> {
    const contract = await this.resolveContract();
    const count = (await this.getNumberOfValidators(contract)).toNumber();

    return Promise.all(
      Array.from(Array(count).keys()).map(async (i) => {
        const address = await contract.addresses(i);
        return this.getValidatorDetails(contract, address);
      }),
    );
  }

  resolveContract = async (): Promise<Contract> => {
    if (!this.registry) {
      this.registry = new ContractRegistry(
        this.blockchain.provider,
        this.settings.blockchain.contracts.registry.address,
      );
    }

    const address = await this.registry.getAddress(this.settings.blockchain.contracts.validatorRegistry.name);
    return new Contract(address, ABI.validatorRegistryAbi, this.blockchain.provider);
  };

  async getValidatorDetails(contract: Contract, address: string): Promise<Validator> {
    const [id, location] = await contract.validators(address);
    return {
      id,
      location,
    };
  }

  async getNumberOfValidators(contract: Contract): Promise<BigNumber> {
    return contract.getNumberOfValidators();
  }
}

export default ValidatorRegistryContract;
