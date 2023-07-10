import {inject, injectable} from 'inversify';
import {Contract, BigNumber} from 'ethers';
import {ContractRegistry} from '@umb-network/toolbox';

import stakingBankAbi from './IStakingBank.abi.json';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import {Validator} from '../types/Validator';

@injectable()
export class StakingBankContract {
  readonly settings!: Settings;
  readonly blockchain!: Blockchain;
  registry!: ContractRegistry;

  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    this.settings = settings;
    this.blockchain = blockchain;
  }

  async resolveValidators(): Promise<Validator[]> {
    const contract = await this.resolveContract();
    const addresses = await this.resolveValidatorsAddresses(contract);
    const validators = await Promise.all(addresses.map((address) => contract.validators(address)));

    return validators.map((info) => {
      return <Validator>{
        id: info.id.toLowerCase(),
        location: info.location,
        power: BigNumber.from(1),
      };
    });
  }

  resolveContract = async (): Promise<Contract> => {
    if (!this.registry) {
      this.registry = new ContractRegistry(this.blockchain.getProvider(), this.blockchain.getContractRegistryAddress());
    }

    const chainAddress = await this.registry.getAddress(this.settings.blockchain.contracts.bank.name);
    return new Contract(chainAddress, stakingBankAbi, this.blockchain.getProvider());
  };

  protected async getNumberOfValidators(contract: Contract): Promise<number> {
    return (await contract.getNumberOfValidators()).toNumber();
  }

  protected async resolveValidatorsAddresses(contract: Contract): Promise<string[]> {
    const numberOfValidators = await this.getNumberOfValidators(contract);
    const arr: number[] = new Array(numberOfValidators).fill(0);
    return arr.map((n, i) => contract.addresses(i));
  }
}
