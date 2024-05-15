import path from 'path';
import ethers, {Contract} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type PricesResponse = {
  values: string[];
  timestamp: string;
};

export type PairRequest = {
  inputTokenAddress: string;
  outputTokenAddress: string;
  amount: string;
};

export abstract class SovrynHelperBase {
  contract!: Contract;

  abstract getPrices(pairs: PairRequest[]): Promise<PricesResponse>;
}

export class SovrynHelper extends SovrynHelperBase {
  protected ABI!: never;

  constructor(contractAddress: string, blockchainNodeUrl: string) {
    super();

    this.ABI = JSON.parse(readFileSync(__dirname + '/UniswapV3Helper.abi.json', 'utf-8')) as never;

    const provider = new ethers.providers.JsonRpcProvider(blockchainNodeUrl);
    this.contract = new Contract(contractAddress, this.ABI, provider);
  }

  async getPrices(pairs: PairRequest[]): Promise<PricesResponse> {
    return this.contract.getPrices(pairs);
  }
}
