import {Contract, BigNumber} from 'ethers';

import stakingBankAbi from './IStakingBank.abi.json';
import Blockchain from '../../lib/Blockchain';
import {Validator} from '../../types/Validator';
import {StakingBankInterface} from '../interfaces/StakingBankInterface';
import {RegistryInterface} from '../interfaces/RegistryInterface';
import {RegistryContractFactory} from '../../factories/contracts/RegistryContractFactory';

export class StakingBankContract implements StakingBankInterface {
  readonly bankName!: string;
  readonly blockchain!: Blockchain;
  registry!: RegistryInterface;

  constructor(blockchain: Blockchain, bankName = 'StakingBank') {
    this.bankName = bankName;
    this.blockchain = blockchain;
  }

  async address(): Promise<string> {
    const contract = await this.resolveContract();
    return contract.address;
  }

  chainId(): string {
    return this.blockchain.chainId;
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
      this.registry = RegistryContractFactory.create(this.blockchain);
    }

    const bankAddress = await this.registry.getAddress(this.bankName);
    return new Contract(bankAddress, stakingBankAbi, this.blockchain.provider.getRawProvider());
  };

  async getNumberOfValidators(): Promise<number> {
    const contract = await this.resolveContract();
    return (await contract.getNumberOfValidators()).toNumber();
  }

  protected async numberOfValidators(contract: Contract): Promise<number> {
    return (await contract.getNumberOfValidators()).toNumber();
  }

  protected async resolveValidatorsAddresses(contract: Contract): Promise<string[]> {
    const numberOfValidators = await this.numberOfValidators(contract);
    const arr: number[] = new Array(numberOfValidators).fill(0);
    return arr.map((n, i) => contract.addresses(i));
  }
}
