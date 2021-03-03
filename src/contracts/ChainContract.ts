import {inject, injectable} from 'inversify';
import {BigNumber, Contract} from 'ethers';
import {TransactionResponse} from '@ethersproject/providers';
import {ABI, ContractRegistry} from '@umb-network/toolbox';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';

@injectable()
class ChainContract {
  contract!: Contract;
  settings!: Settings;
  blockchain!: Blockchain;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(Blockchain) blockchain: Blockchain
  ) {
    this.settings = settings;
    this.blockchain = blockchain;
  }

  resolveContract = async (): Promise<Contract> => {
    if (this.contract) {
      return this.contract;
    }

    const registry = new ContractRegistry(
      this.blockchain.provider,
      this.settings.blockchain.contracts.registry.address,
    );

    const chainAddress = await registry.getAddress(this.settings.blockchain.contracts.chain.name);
    this.contract = new Contract(chainAddress, ABI.chainAbi, this.blockchain.provider);
    return this.contract;
  };

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
}

export default ChainContract;
