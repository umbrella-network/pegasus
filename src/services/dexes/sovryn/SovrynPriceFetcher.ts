import {inject, injectable} from 'inversify';
import path from 'path';
import {BigNumber, Contract} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {BaseProvider} from '@ethersproject/providers';
import {Logger} from 'winston';

import {FeedFetcherInterface} from '../../../types/fetchers.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {bigIntToFloatingPoint} from '../../../utils/math.js';
import {RegistryContractFactory} from '../../../factories/contracts/RegistryContractFactory.js';
import {BlockchainRepository} from '../../../repositories/BlockchainRepository.js';

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
  @inject(BlockchainRepository) private blockchainRepository!: BlockchainRepository;

  public async apply(pairs: PairRequest[]): Promise<(number | undefined)[]> {
    console.log(pairs);
    let response;
    try {
      response = await this.getPrices(pairs);
    } catch (error) {
      this.logger.error('[SovrynPriceFetcher] failed to get price for pairs.');

      for (const pair of pairs) {
        this.logger.error(`[SovrynPriceFetcher] price is not successful for pair: ${pairRequestToString(pair)}.`);
      }

      return [];
    }

    const pricesResponse: (number | undefined)[] = [];
    for (const [ix, price_] of response.prices.entries()) {
      const {price, success} = price_;

      const successfulPrice = success;
      if (!successfulPrice) {
        this.logger.error(`[SovrynPriceFetcher] price is not successful for pair: ${pairRequestToString(pairs[ix])}.`);
        pricesResponse.push(undefined);
        continue;
      }

      const bigIntPrice = price.toBigInt();

      pricesResponse.push(bigIntToFloatingPoint(bigIntPrice, 18));
    }
    console.log(pricesResponse);
    return pricesResponse;
  }

  private async getPrices(pairs: PairRequest[]): Promise<PricesResponse> {
    const abi = JSON.parse(readFileSync(__dirname + '/SovrynFetcherHelper.abi.json', 'utf-8')).abi as never;

    const blockchain = this.blockchainRepository.get(ChainsIds.ROOTSTOCK);
    const registry = RegistryContractFactory.create(blockchain);
    const contractAddress = await registry.getAddress('SovrynFetcherHelper');

    const provider = blockchain.provider.getRawProviderSync<BaseProvider>();
    const contract = new Contract(contractAddress, abi, provider);

    return await contract.callStatic.getPrices(pairs);
  }
}
