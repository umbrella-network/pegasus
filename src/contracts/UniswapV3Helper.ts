import {inject, injectable} from 'inversify';
import ABI from './UniswapV3Helper.abi.json';
import {Provider} from '@ethersproject/providers';
import {BigNumber, Contract} from 'ethers';
import Settings from '../types/Settings';
import {BlockchainProviderRepository} from '../repositories/BlockchainProviderRepository';

export type Price = {
  price: BigNumber;
  success: boolean;
};

export type PricesResponse = {
  prices: Price[];
  timestamp: BigNumber;
};

@injectable()
export class UniswapV3Helper {
  static ABI = ABI;

  readonly contractId!: string;
  readonly provider!: Provider;
  readonly contract!: Contract;
  readonly periodForAveragePrice = 60;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(BlockchainProviderRepository) blockchainProviderRepository: BlockchainProviderRepository,
  ) {
    this.contractId = settings.api.uniswap.helperContractId;
    this.provider = <Provider>blockchainProviderRepository.get('ethereum');
    this.contract = new Contract(this.contractId, UniswapV3Helper.ABI, this.provider);
  }

  async translateTokenAddressesToSymbols(tokens: string[]): Promise<string[]> {
    return this.contract.tokensSymbols(tokens);
  }

  async getPrices(props: {tokenA: string; tokenB: string; fee: number}[]): Promise<PricesResponse> {
    return this.contract.getPrices(props, this.periodForAveragePrice);
  }
}
