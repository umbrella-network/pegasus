import {inject, injectable} from 'inversify';
import {Contract, BigNumber} from 'ethers';
import {TransactionResponse} from '@ethersproject/providers';
import {ContractRegistry} from '@umb-network/toolbox';
import {PayableOverrides} from '@ethersproject/contracts';

import chainAbi from './Chain.abi.json';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import {ChainStatus} from '../types/ChainStatus';
import {Validator} from '../types/Validator';
import {ChainSubmitArgs} from '../types/ChainSubmit';

@injectable()
class ChainContract {
  readonly settings!: Settings;
  readonly blockchain!: Blockchain;
  registry!: ContractRegistry;

  constructor(@inject('Settings') settings: Settings, @inject(Blockchain) blockchain: Blockchain) {
    this.settings = settings;
    this.blockchain = blockchain;
  }

  async address(): Promise<string> {
    return this.resolveAddress();
  }

  async requiredSignatures(): Promise<number> {
    const contract = await this.resolveContract();
    return contract.callStatic.requiredSignatures();
  }

  async resolveStatus(): Promise<[address: string, status: ChainStatus]> {
    const contract = await this.resolveContract();
    return Promise.all([contract.address, contract.getStatus()]);
  }

  resolveValidators(chainStatus: ChainStatus): Validator[] {
    return chainStatus.validators.map((address, i) => {
      return {
        id: address.toLowerCase(),
        location: chainStatus.locations[i],
        power: chainStatus.powers[i],
      };
    });
  }

  async resolveAddress(): Promise<string> {
    return (await this.resolveContract()).address;
  }

  async submit(args: ChainSubmitArgs, payableOverrides: PayableOverrides): Promise<TransactionResponse> {
    return (await this.resolveContract())
      .connect(this.blockchain.wallet)
      .submit(args.dataTimestamp, args.root, args.keys, args.values, args.v, args.r, args.s, payableOverrides);
  }

  async estimateGasForSubmit(args: ChainSubmitArgs): Promise<BigNumber> {
    return (await this.resolveContract())
      .connect(this.blockchain.wallet)
      .estimateGas.submit(args.dataTimestamp, args.root, args.keys, args.values, args.v, args.r, args.s);
  }

  resolveContract = async (): Promise<Contract> => {
    if (!this.registry) {
      this.registry = new ContractRegistry(this.blockchain.getProvider(), this.blockchain.getContractRegistryAddress());
    }

    const chainAddress = await this.registry.getAddress(this.settings.blockchain.contracts.chain.name);
    return new Contract(chainAddress, chainAbi, this.blockchain.getProvider());
  };
}

export default ChainContract;
