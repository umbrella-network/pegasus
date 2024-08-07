import {inject, injectable} from 'inversify';
import path from 'path';
import {BigNumber, Contract} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {BaseProvider} from '@ethersproject/providers';
import {Logger} from 'winston';

import {
  FetcherName,
  FetcherResult,
  NumberOrUndefined,
  FetchedValueType,
  FeedFetcherInterface,
  FeedFetcherOptions,
} from '../../../types/fetchers.js';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {bigIntToFloatingPoint} from '../../../utils/math.js';
import {RegistryContractFactory} from '../../../factories/contracts/RegistryContractFactory.js';
import {BlockchainRepository} from '../../../repositories/BlockchainRepository.js';
import {PriceDataRepository} from '../../../repositories/PriceDataRepository.js';
import {SovrynDataRepository, SovrynDataRepositoryInput} from '../../../repositories/fetchers/SovrynDataRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type SovrynPriceInputParams = {
  base: string;
  quote: string;
  amountInDecimals: number;
};

interface Price {
  price: BigNumber;
  success: boolean;
}

type PricesResponse = {
  prices: Price[];
  timestamp: BigNumber;
};

const pairRequestToString = (pair: SovrynPriceInputParams) => {
  return '{' + pair.base + ' -> ' + pair.quote + ' amount:' + pair.amountInDecimals + '}';
};

/*
For getting the prices of different of a Sovryn pool the `base` (input token)
and `quote` (output token), and the `amount` of the input token should be provided.

weBTC-rUSDT:
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
  @inject(SovrynDataRepository) private sovrynDataRepository!: SovrynDataRepository;
  @inject(BlockchainRepository) private blockchainRepository!: BlockchainRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.SovrynPrice}]`;
  static fetcherSource = '';

  public async apply(params: SovrynPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    this.logger.debug(
      `${this.logPrefix} fetcher started for ${params.map((p) => `[${p.base}/${p.quote}]`).join(', ')}`,
    );
    let timestamp;

    try {
      const response = await this.fetchPrices(params);
      await this.sovrynDataRepository.save(this.processResponse(response, params));
      timestamp = Number(response.timestamp);
    } catch (error) {
      this.logger.error(`${this.logPrefix} failed to get price for pairs. ${error}`);

      for (const pair of params) {
        this.logger.error(`${this.logPrefix} price is not successful for pair: ${pairRequestToString(pair)}.`);
      }

      return {prices: []};
    }

    const pricesResponse: NumberOrUndefined[] = await this.sovrynDataRepository.getPrices(params, timestamp);

    const fetcherResult = {prices: pricesResponse, timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.SovrynPrice,
      FetchedValueType.Price,
      SovrynPriceFetcher.fetcherSource,
    );

    return fetcherResult;
  }

  private async fetchPrices(pairs: SovrynPriceInputParams[]): Promise<PricesResponse> {
    const abi = JSON.parse(readFileSync(__dirname + '/SovrynFetcherHelper.abi.json', 'utf-8')).abi as never;

    const blockchain = this.blockchainRepository.get(ChainsIds.ROOTSTOCK);
    const registry = RegistryContractFactory.create(blockchain);
    const contractAddress = await registry.getAddress('SovrynFetcherHelper');

    const provider = blockchain.provider.getRawProviderSync<BaseProvider>();
    const contract = new Contract(contractAddress, abi, provider);

    return contract.callStatic.getPrices(pairs);
  }

  private processResponse(data: PricesResponse, params: SovrynPriceInputParams[]): SovrynDataRepositoryInput[] {
    const successfulPrices = data.prices.map(({price, success}, ix) => {
      if (!success) {
        this.logger.error(`${this.logPrefix} price is not successful for pair: ${pairRequestToString(params[ix])}.`);
        return undefined;
      }

      const bigIntPrice = price.toBigInt();
      const fetchedPrice = bigIntToFloatingPoint(bigIntPrice, 18);

      this.logger.debug(`${this.logPrefix} ${pairRequestToString(params[ix])}: ${price.toString()} => ${fetchedPrice}`);

      return <SovrynDataRepositoryInput>{
        params: params[ix],
        value: fetchedPrice,
        timestamp: Number(data.timestamp),
      };
    });

    return successfulPrices.filter((p) => p != undefined) as SovrynDataRepositoryInput[];
  }
}
