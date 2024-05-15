import path from 'path';
import {Contract} from 'ethers';
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
  blockchainNodeUrl: string;
  sovrynHelperContractAddress: string;

  constructor(blockchainNodeUrl: string, sovrynHelperContractAddress: string) {
    this.blockchainNodeUrl = blockchainNodeUrl;
    this.sovrynHelperContractAddress = sovrynHelperContractAddress;
  }

  abstract getPrices(pairs: PairRequest[]): Promise<PricesResponse>;
}

export class SovrynHelper extends SovrynHelperBase {
  protected ABI!: never;
  readonly contract!: Contract;

  constructor(contractAddress: string, blockchainNodeUrl: string) {
    super(contractAddress, blockchainNodeUrl);

    this.ABI = JSON.parse(readFileSync(__dirname + '/UniswapV3Helper.abi.json', 'utf-8')) as never;

    //this.contract = new Contract(this.sovrynHelperContractAddress, this.ABI, this.provider);
  }

  async getPrices(pairs: PairRequest[]): Promise<PricesResponse> {
    return this.contract.getPrices(pairs);
  }
}
