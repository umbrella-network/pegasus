import {inject, injectable} from 'inversify';
import path from 'path';
import {BigNumber, Contract} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {BaseProvider} from '@ethersproject/providers';
import {Logger} from 'winston';

import {
  FeedMultiFetcherInterface,
  FetcherName,
  FetcherResult,
  FeedMultiFetcherOptions,
  NumberOrUndefined,
} from '../../../types/fetchers.js';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {bigIntToFloatingPoint} from '../../../utils/math.js';
import {RegistryContractFactory} from '../../../factories/contracts/RegistryContractFactory.js';
import {BlockchainRepository} from '../../../repositories/BlockchainRepository.js';
import {PriceDataRepository, PriceValueType} from '../../../repositories/PriceDataRepository.js';

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
export class SovrynPriceFetcher implements FeedMultiFetcherInterface {
  @inject(BlockchainRepository) private blockchainRepository!: BlockchainRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject('Logger') private logger!: Logger;

  private logPrefix = '[SovrynPriceFetcher]';
  static fetcherSource = '';

  public async apply(pairs: PairRequest[], options: FeedMultiFetcherOptions): Promise<FetcherResult> {
    this.logger.debug(`${this.logPrefix} fetcher started for ${pairs.map((p) => `[${p.base}/${p.quote}]`).join(', ')}`);
    let response;

    try {
      response = await this.getPrices(pairs);
      this.logger.debug(`${this.logPrefix} data fetched (${pairs.length})`);
    } catch (error) {
      this.logger.error(`${this.logPrefix} failed to get price for pairs. ${error}`);

      for (const pair of pairs) {
        this.logger.error(`${this.logPrefix} price is not successful for pair: ${pairRequestToString(pair)}.`);
      }

      return {prices: []};
    }

    const pricesResponse: NumberOrUndefined[] = [];

    for (const [ix, price_] of response.prices.entries()) {
      const {price, success} = price_;

      if (!success) {
        this.logger.error(`${this.logPrefix} price is not successful for pair: ${pairRequestToString(pairs[ix])}.`);
        pricesResponse.push(undefined);
        continue;
      }

      const bigIntPrice = price.toBigInt();
      const fetchedPrice = bigIntToFloatingPoint(bigIntPrice, 18);
      pricesResponse.push(fetchedPrice);

      this.logger.debug(`${this.logPrefix} ${pairRequestToString(pairs[ix])}: ${price.toString()} => ${fetchedPrice}`);
    }

    const fetcherResult = {prices: pricesResponse, timestamp: Number(response.timestamp)};

    await this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.SovrynPrice,
      PriceValueType.Price,
      SovrynPriceFetcher.fetcherSource,
    );

    return fetcherResult;
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
