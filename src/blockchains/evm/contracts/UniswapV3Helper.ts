import {inject, injectable} from 'inversify';
import ABI from './UniswapV3Helper.abi.json';
import {StaticJsonRpcProvider} from '@ethersproject/providers';
import {BigNumber, Contract} from 'ethers';
import Settings from '../../../types/Settings';
import {BlockchainProviderRepository} from '../../../repositories/BlockchainProviderRepository';

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

  readonly contractId: string = '';
  readonly provider!: StaticJsonRpcProvider;
  readonly contract!: Contract;
  readonly periodForAveragePrice = 60;

  constructor(
    @inject('Settings') settings: Settings,
    @inject(BlockchainProviderRepository) blockchainProviderRepository: BlockchainProviderRepository,
  ) {
    const blockchainKey = 'ethereum';

    if (!settings.api.uniswap.helperContractId || !settings.blockchains[blockchainKey].providerUrl.join('')) {
      return;
    }

    this.contractId = settings.api.uniswap.helperContractId;
    this.provider = <StaticJsonRpcProvider>blockchainProviderRepository.get(blockchainKey);
    this.contract = new Contract(this.contractId, UniswapV3Helper.ABI, this.provider);
  }

  async translateTokenAddressesToSymbols(tokens: string[]): Promise<string[]> {
    return (await this.contract.tokensSymbols(tokens)).map((s: string) => s.replace(/\0/g, ''));
  }

  async getPrices(props: {tokenA: string; tokenB: string; fee: number}[]): Promise<PricesResponse> {
    return this.contract.getPrices(props, this.periodForAveragePrice);
  }
}
