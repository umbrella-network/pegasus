import path from 'path';
import ethers, {BigNumber, Contract} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';

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
  amount: bigint | number;
};

export abstract class SovrynHelperBase {
  contract!: Contract;

  abstract getPrices(pairs: PairRequest[]): Promise<PricesResponse>;
}

export class SovrynHelper extends SovrynHelperBase {
  protected ABI!: never;

  constructor(contractAddress: string, blockchainNodeUrl: string) {
    super();

    this.ABI = JSON.parse(readFileSync(__dirname + '/SovrynHelper.abi.json', 'utf-8')).abi as never;

    const provider = new ethers.providers.JsonRpcProvider(blockchainNodeUrl);
    this.contract = new Contract(contractAddress, this.ABI, provider);
  }

  async getPrices(pairs: PairRequest[]): Promise<PricesResponse> {
    const result = await this.contract.callStatic.getPrices(pairs);
    return result;
  }
}
