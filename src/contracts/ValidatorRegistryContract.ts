import {inject, injectable} from 'inversify';
import {BigNumber, Contract} from 'ethers';
import {ABI, ContractRegistry} from '@umb-network/toolbox';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import {Validator} from '../types/Validator';

@injectable()
class ValidatorRegistryContract {
  contract!: Contract;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(Blockchain) blockchain: Blockchain
  ) {
    new ContractRegistry(blockchain.provider, settings.blockchain.contracts.registry.address)
      .getAddress(settings.blockchain.contracts.validatorRegistry.name)
      .then((contractAddress: string) => {
        this.contract = new Contract(
          contractAddress,
          ABI.validatorRegistryAbi,
          blockchain.provider
        ).connect(blockchain.wallet);
      })
  }

  getNumberOfValidators = async (): Promise<BigNumber> => this.contract.getNumberOfValidators();

  getValidatorDetails = async (address: string): Promise<Validator> => {
    const [id, location] = await this.contract.validators(address);
    return {
      id,
      location,
    };
  };

  getValidators = async (): Promise<Validator[]> => {
    const result = [];
    const count = (await this.getNumberOfValidators()).toNumber();

    for (let i = 0; i < count; ++i) {
      const address = await this.contract.addresses(i);
      const validator = await this.getValidatorDetails(address);
      result.push(validator);
    }

    return result;
  }
}

export default ValidatorRegistryContract;
