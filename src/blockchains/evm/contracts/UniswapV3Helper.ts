import {inject, injectable} from 'inversify';
import {StaticJsonRpcProvider} from '@ethersproject/providers';
import {BigNumber, Contract} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import Settings from '../../../types/Settings.js';
import {BlockchainProviderRepository} from '../../../repositories/BlockchainProviderRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  protected ABI!: never;

  readonly contractAddress: string = '';
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

    this.ABI = JSON.parse(readFileSync(__dirname + '/UniswapV3Helper.abi.json', 'utf-8')) as never;

    this.contractAddress = settings.api.uniswap.helperContractId;
    this.provider = <StaticJsonRpcProvider>blockchainProviderRepository.get(blockchainKey);
    this.contract = new Contract(this.contractAddress, this.ABI, this.provider);
  }

  async translateTokenAddressesToSymbols(tokens: string[]): Promise<string[]> {
    return (await this.contract.tokensSymbols(tokens)).map((s: string) => s.replace(/\0/g, ''));
  }

  async getPrices(props: {tokenA: string; tokenB: string; fee: number}[]): Promise<PricesResponse> {
    return this.contract.getPrices(props, this.periodForAveragePrice);
  }
}
