import {inject, injectable} from 'inversify';
import path from 'path';
import {BigNumber, Contract} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import {BaseProvider} from '@ethersproject/providers';
import {Logger} from 'winston';

import {FetcherName, ServiceInterface} from '../../../../types/fetchers.js';

import {ChainsIds} from '../../../../types/ChainsIds.js';
import {bigIntToFloatingPoint} from '../../../../utils/math.js';
import {RegistryContractFactory} from '../../../../factories/contracts/RegistryContractFactory.js';
import {BlockchainRepository} from '../../../../repositories/BlockchainRepository.js';
import {
  SovrynDataRepository,
  SovrynDataRepositoryInput,
} from '../../../../repositories/fetchers/SovrynDataRepository.js';
import {MappingRepository} from '../../../../repositories/MappingRepository.js';
import {DeviationFeedsGetter} from '../../_common/DeviationFeedsGetter.js';

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
  return '{' + pair.base + ' -> ' + pair.quote + ' amountInDecimals:' + pair.amountInDecimals + '}';
};

@injectable()
export class SovrynPriceFetcher implements ServiceInterface {
  @inject(DeviationFeedsGetter) feedsGetter!: DeviationFeedsGetter;
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(SovrynDataRepository) private sovrynDataRepository!: SovrynDataRepository;
  @inject(BlockchainRepository) private blockchainRepository!: BlockchainRepository;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.SovrynPrice}]`;
  static fetcherSource = '';

  public async apply(): Promise<void> {
    const params = await this.feedsGetter.apply<SovrynPriceInputParams>(FetcherName.SovrynPrice);

    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return;
    }

    try {
      const response = await this.fetchPrices(params);
      await this.sovrynDataRepository.save(this.processResponse(response, params));
    } catch (error) {
      this.logger.error(`${this.logPrefix} failed to get price for pairs. ${error}`);

      for (const pair of params) {
        this.logger.error(`${this.logPrefix} price is not successful for pair: ${pairRequestToString(pair)}.`);
      }
    }
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
