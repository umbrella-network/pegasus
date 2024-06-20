import {StaticJsonRpcProvider} from '@ethersproject/providers';
import {Contract} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class UniswapV3Helper {
  readonly ABI!: {abi: never};
  contractAddress: string = '';
  contract!: Contract;
  provider!: StaticJsonRpcProvider;

  constructor(provider: StaticJsonRpcProvider, contractAddress: string) {
    this.provider = provider;
    this.contractAddress = contractAddress;
    this.ABI = JSON.parse(readFileSync(__dirname + '/UniswapV3Helper.abi.json', 'utf-8')) as never;
    this.contract = new Contract(contractAddress, this.ABI?.abi, provider);
  }

  getContract() {
    if (this.contract) {
      return this.contract;
    }

    try {
      this.contract = new Contract(this.contractAddress, this.ABI?.abi, this.provider);
    } catch (e) {
      throw new Error(`[UniswapV3Helper] failed to connect to helper ${e}`);
    }

    return this.contract;
  }
}
