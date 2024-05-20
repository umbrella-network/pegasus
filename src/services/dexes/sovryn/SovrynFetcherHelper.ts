import {inject, injectable} from 'inversify';
import path from 'path';
import ethers, {BigNumber, Contract} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';

import Settings from 'src/types/Settings';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface Price {
  price: BigNumber;
  success: boolean;
}

export type PricesResponse = {
  prices: Price[];
  timestamp: BigNumber;
};

export type PairRequest = {
  base: string;
  quote: string;
  quoteDecimals: number;
  amount: bigint | number;
};

@injectable()
export abstract class SovrynFetcherHelperBase {
  contract!: Contract;
  abstract getPrices(pairs: PairRequest[]): Promise<PricesResponse>;
}

@injectable()
export class SovrynFetcherHelper extends SovrynFetcherHelperBase {
  @inject('Settings') settings!: Settings;

  async getPrices(pairs: PairRequest[]): Promise<PricesResponse> {
    const blockchainNodeUrl = this.settings.blockchain.multiChains.rootstock?.providerUrl;
    const contractAddress = this.settings.dexes.sovryn?.rootstock?.helperContractAddress as string;
    const abi = JSON.parse(readFileSync(__dirname + '/SovrynFetcherHelper.abi.json', 'utf-8')).abi as never;

    const provider = new ethers.providers.JsonRpcProvider(blockchainNodeUrl);
    this.contract = new Contract(contractAddress, abi, provider);
    return await this.contract.callStatic.getPrices(pairs);
  }
}
