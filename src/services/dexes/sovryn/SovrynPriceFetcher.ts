import {inject, injectable} from 'inversify';
import path from 'path';
import {BigNumber, Contract} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {BaseProvider} from '@ethersproject/providers';

import {FeedFetcherInterface} from 'src/types/fetchers.js';
import Settings from 'src/types/Settings';
import {ProviderRepository} from '../../../repositories/ProviderRepository.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {bigIntToFloatingPoint} from '../../../utils/math.js';
import {Logger} from 'winston';

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
  amountInDecimals: number;
};

const pairRequestToString = (pair: PairRequest) => {
  return '{' + pair.base + ' -> ' + pair.quote + ' amount:' + pair.amountInDecimals + '}';
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
          amountIdDecimals: 18
*/
@injectable()
export class SovrynPriceFetcher implements FeedFetcherInterface {
  @inject('Logger') private logger!: Logger;
  @inject('Settings') private settings!: Settings;
  @inject(ProviderRepository) private providerRepository!: ProviderRepository;

  public async apply(pair: PairRequest): Promise<number | undefined> {
    try {
      const prices = await this.getPrice(pair);
      const {price, success} = prices.prices[0];

      const successfulPrice = success;
      if (!successfulPrice) {
        this.logger.error(`[SovrynPriceFetcher] price is not successful for pair: ${pairRequestToString(pair)}.`);
        return;
      }

      const bigIntPrice = price.toBigInt();

      return bigIntToFloatingPoint(bigIntPrice, 18);
    } catch (error) {
      this.logger.error(`[SovrynPriceFetcher] failed to get price for pair: ${pairRequestToString(pair)}. ${error}`);
      return;
    }
  }

  private async getPrice(pair: PairRequest): Promise<PricesResponse> {
    const abi = JSON.parse(readFileSync(__dirname + '/SovrynFetcherHelper.abi.json', 'utf-8')).abi as never;

    // TODO: the contract address should be get from the registry contract
    const contractAddress = this.settings.dexes.sovryn?.rootstock?.helperContractAddress as string;
    const provider = this.providerRepository.get(ChainsIds.ROOTSTOCK).getRawProviderSync<BaseProvider>();
    const contract = new Contract(contractAddress, abi, provider);

    return await contract.callStatic.getPrices([pair]);
  }
}
