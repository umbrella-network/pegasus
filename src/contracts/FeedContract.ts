import {inject, injectable} from 'inversify';
import {Contract, BigNumber, ethers} from 'ethers';
import {ContractRegistry} from '@umb-network/toolbox';
import {PayableOverrides} from '@ethersproject/contracts';
import {TransactionResponse} from '@ethersproject/providers';

import umbrellaFeedsAbi from './UmbrellaFeeds.abi.json';
import Settings from '../types/Settings';
import Blockchain from '../lib/Blockchain';
import {PriceDataWithKey, UmbrellaFeedsUpdateArgs} from '../types/DeviationFeeds';

@injectable()
export class FeedContract {
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

  async update(args: UmbrellaFeedsUpdateArgs, payableOverrides: PayableOverrides): Promise<TransactionResponse> {
    if (!this.blockchain.deviationWallet) {
      throw new Error(`[FeedContract] deviationWallet empty for ${this.blockchain.chainId}`);
    }

    return (await this.resolveContract())
      .connect(this.blockchain.deviationWallet)
      .update(args.keys, args.priceDatas, args.signatures, payableOverrides);
  }

  async getManyPriceDataRaw(keys: string[]): Promise<PriceDataWithKey[]> {
    const contract = await this.resolveContract();
    const pricesData = await contract.callStatic.getManyPriceDataRaw(keys.map(ethers.utils.id));

    return pricesData.map((data: PriceDataWithKey, i: number): PriceDataWithKey => {
      return {
        ...data,
        price: BigInt(data.price.toString()),
        key: keys[i],
      };
    });
  }

  async requiredSignatures(): Promise<number> {
    const contract = await this.resolveContract();
    return contract.callStatic.REQUIRED_SIGNATURES();
  }

  async resolveAddress(): Promise<string> {
    return (await this.resolveContract()).address;
  }

  async estimateGasForSubmit(args: UmbrellaFeedsUpdateArgs): Promise<BigNumber> {
    if (!this.blockchain.deviationWallet) {
      throw new Error(`[FeedContract] deviationWallet empty for ${this.blockchain.chainId}`);
    }

    return (await this.resolveContract())
      .connect(this.blockchain.deviationWallet)
      .estimateGas.update(args.keys, args.priceDatas, args.signatures);
  }

  protected resolveContract = async (): Promise<Contract> => {
    if (!this.registry) {
      this.registry = new ContractRegistry(this.blockchain.getProvider(), this.blockchain.getContractRegistryAddress());
    }

    const address = await this.registry.getAddress(this.settings.blockchain.contracts.feeds.name);

    if (address === ethers.constants.AddressZero) {
      throw Error(`[${this.blockchain.chainId}] empty address for ${this.settings.blockchain.contracts.feeds.name}`);
    }

    return new Contract(address, umbrellaFeedsAbi.abi, this.blockchain.getProvider());
  };
}
