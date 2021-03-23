import {inject, injectable} from 'inversify';
import {BigNumber, Contract} from 'ethers';
import {TransactionResponse} from '@ethersproject/providers';
import {ABI, ContractRegistry} from '@umb-network/toolbox';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';

@injectable()
class ChainContract {
  readonly settings!: Settings;
  readonly blockchain!: Blockchain;
  registry!: ContractRegistry;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(Blockchain) blockchain: Blockchain,
  ) {
    this.settings = settings;
    this.blockchain = blockchain;
  }

  async getAddress(): Promise<string> {
    return (await this.resolveContract()).address;
  }

  async getLeaderAddress(): Promise<string> {
    return (await this.resolveContract()).getLeaderAddress();
  }

  async getBlockHeight(): Promise<BigNumber> {
    return (await this.resolveContract()).getBlockHeight();
  }

  async getBlockVotersCount(blockHeight: BigNumber): Promise<BigNumber> {
    return (await this.resolveContract()).getBlockVotersCount(blockHeight);
  }

  async submit(root: string, keys: string[], values: string[], v: number[], r: string[], s: string[]): Promise<TransactionResponse> {
    return (await this.resolveContract()).connect(this.blockchain.wallet).submit(root, keys, values, v, r, s, {
      gasPrice: this.settings.blockchain.transactions.gasPrice,
    });
  }

  resolveContract = async (): Promise<Contract> => {
    if (!this.registry) {
      this.registry = new ContractRegistry(
        this.blockchain.provider,
        this.settings.blockchain.contracts.registry.address,
      );
    }

    const chainAddress = await this.registry.getAddress(this.settings.blockchain.contracts.chain.name);
    return new Contract(chainAddress, ABI.chainAbi, this.blockchain.provider);
  };
}

export default ChainContract;
