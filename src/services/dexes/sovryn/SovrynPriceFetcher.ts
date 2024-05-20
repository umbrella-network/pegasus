import {inject, injectable} from 'inversify';
import path from 'path';
import ethers, {BigNumber, Contract} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';

import {FeedFetcherInterface} from 'src/types/fetchers.js';
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

/*
For getting the prices of different of a Sovryn pool the `base` (input token)
and `quote` (output token), and the `amount` of the input token should be provided.

weBTC-rUSDT:
  discrepancy: 1
  precision: 2
  inputs:
    - fetcher:
        name: SovrynPriceFetcher
        params:
          base: '0x69fe5cec81d5ef92600c1a0db1f11986ab3758ab'
          quote: '0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0'
          quoteDecimals: 8
          amount: "1000"
*/
@injectable()
export class SovrynPriceFetcher implements FeedFetcherInterface {
  @inject('Settings') settings!: Settings;

  async apply(pair: PairRequest): Promise<number> {
    pair.amount = Number(pair.amount);

    const abi = JSON.parse(readFileSync(__dirname + '/SovrynFetcherHelper.abi.json', 'utf-8')).abi as never;

    const blockchainNodeUrl = this.settings.blockchain.multiChains.rootstock?.providerUrl as string;
    const contractAddress = this.settings.dexes.sovryn?.rootstock?.helperContractAddress as string;
    const provider = new ethers.providers.JsonRpcProvider(blockchainNodeUrl);
    const contract = new Contract(contractAddress, abi, provider);

    const prices = await contract.callStatic.getPrices([pair]);

    const bigIntPrice = prices.prices[0].price.toBigInt();

    return BigIntToFloatingPoint(bigIntPrice, pair.quoteDecimals);
  }
}

export const BigIntToFloatingPoint = (integerValue: bigint, decimals: number): number => {
  const stringValue = integerValue.toString();

  let intPart = '';
  let decPart = '';
  const lengthDiff = stringValue.length - decimals;
  if (lengthDiff > 0) {
    intPart = stringValue.substring(0, lengthDiff);
    decPart = stringValue.substring(lengthDiff);
  } else {
    intPart = '0';
    decPart = '0'.repeat(-lengthDiff) + stringValue;
  }

  return Number(intPart + '.' + decPart);
};
