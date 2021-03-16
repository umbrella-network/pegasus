import {inject, injectable} from 'inversify';
import {BigNumber, Contract} from 'ethers';
import {ABI, ContractRegistry} from '@umb-network/toolbox';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import {Validator} from '../types/Validator';

@injectable()
class ValidatorRegistryContract {
  registry!: ContractRegistry;
  settings!: Settings;
  blockchain!: Blockchain;

  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    this.settings = settings;
    this.blockchain = blockchain;
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

  async getNumberOfValidators(): Promise<BigNumber> {
    return (await this.resolveContract()).getNumberOfValidators();
  }

  async getValidatorDetails(address: string): Promise<Validator> {
    const [id, location] = await (await this.resolveContract()).validators(address);
    return {
      id,
      location,
    };
  }

  async getValidators(): Promise<Validator[]> {
    const result = [];
    const count = (await this.getNumberOfValidators()).toNumber();

    for (let i = 0; i < count; ++i) {
      const address = await (await this.resolveContract()).addresses(i);
      const validator = await this.getValidatorDetails(address);
      result.push(validator);
    }

    return result;
  }
}

export default ValidatorRegistryContract;
