import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {BigNumber, ethers} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import {DexProtocolName} from '../../../../types/Dexes.js';
import {ChainsIds} from '../../../../types/ChainsIds.js';
import {UniswapV3PoolRepository} from '../../../../repositories/UniswapV3PoolRepository.js';
import {ContractAddressService} from '../../../../services/ContractAddressService.js';
import {PriceDataRepository} from '../../../../repositories/PriceDataRepository.js';
import TimeService from '../../../../services/TimeService.js';

import {ServiceInterface} from '../../../../types/fetchers.js';
import {
  UniswapV3PriceRepository,
  UniswapV3DataRepositoryInput,
} from '../../../../repositories/fetchers/UniswapV3PriceRepository.js';
import {MappingRepository} from '../../../../repositories/MappingRepository.js';
import {FetchersMappingCacheKeys} from '../../../../services/fetchers/common/FetchersMappingCacheKeys.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type UniswapV3FetcherInputParams = {
  fromChain: string;
  base: string;
  quote: string;
  amountInDecimals: number;
};

type UniswapV3ContractHelperInput = {
  pool: string;
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

@injectable()
export class UniswapV3Fetcher implements ServiceInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(UniswapV3PriceRepository) protected uniswapV3PriceRepository!: UniswapV3PriceRepository;
  @inject(UniswapV3PoolRepository) protected uniswapV3PoolRepository!: UniswapV3PoolRepository;
  @inject(ContractAddressService) contractAddressService!: ContractAddressService;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') protected logger!: Logger;

  private logPrefix = '[UniswapV3Service]';

  readonly dexProtocol = DexProtocolName.UNISWAP_V3;
  static fetcherSource = '';

  async apply(): Promise<void> {
    const params = await this.getInput();

    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return;
    }

    this.logger.debug(`${this.logPrefix}: start with inputs ${JSON.stringify(params)}`);

    const poolsToFetch = await this.getPoolsToFetch(params);

    if (poolsToFetch.size === 0) {
      this.logger.error(`${this.logPrefix} no pools for ${JSON.stringify(params)}`);
      return;
    }

    await Promise.allSettled([...poolsToFetch.entries()].map(([chainId, pools]) => this.fetchData(chainId, pools)));
  }

  private async getPoolsToFetch(
    inputs: UniswapV3FetcherInputParams[],
  ): Promise<Map<ChainsIds, UniswapV3ContractHelperInput[]>> {
    const helperInputMap: Map<ChainsIds, UniswapV3ContractHelperInput[]> = new Map();

    for (const {fromChain, base, quote, amountInDecimals} of inputs) {
      const pool = await this.uniswapV3PoolRepository.findBestPool({
        protocol: this.dexProtocol,
        fromChain,
        base,
        quote,
      });

      if (!pool) {
        this.logger.error(`${this.logPrefix} no pool found for ${base}-${quote}`);
        continue;
      }

      this.logger.debug(`${this.logPrefix} pool found ${base}-${quote}: ${JSON.stringify(pool)}`);

      const helperInput = {pool: pool.address, base, quote, amountInDecimals};
      const currentChainId = pool.chainId as ChainsIds;
      const chainPools = helperInputMap.get(currentChainId);

      if (chainPools) {
        chainPools.push(helperInput);
      } else {
        helperInputMap.set(currentChainId, [helperInput]);
      }
    }

    return helperInputMap;
  }

  private async fetchData(chainId: ChainsIds, poolsToFetch: UniswapV3ContractHelperInput[]): Promise<void> {
    const abi = JSON.parse(readFileSync(__dirname + '/UniswapV3FetcherHelper.abi.json', 'utf-8')).abi as never;
    let parsed: UniswapV3DataRepositoryInput[] = [];

    try {
      const contract = await this.contractAddressService.getContract(chainId, 'UniswapV3FetcherHelper', abi);
      const response = await contract.callStatic.getPrices(poolsToFetch);
      parsed = this.processResult(chainId, response, poolsToFetch);
    } catch (error) {
      this.logger.error(`${this.logPrefix} [${chainId}] getPrices failed: ${error}`);
      return;
    }

    try {
      await this.uniswapV3PriceRepository.save(parsed);
    } catch (error) {
      this.logger.error(`${this.logPrefix} [${chainId}] save failed: ${error}`);
    }
  }

  private processResult(
    chainId: ChainsIds,
    results: PricesResponse,
    poolsToFetch: UniswapV3ContractHelperInput[],
  ): UniswapV3DataRepositoryInput[] {
    return results.prices
      .map((result, ix) => {
        const {base, quote} = poolsToFetch[ix];

        if (!result.success) {
          this.logger.error(`${this.logPrefix} failed to fetch: ${base}, ${quote}`);
          return;
        }

        const price = Number(ethers.utils.formatUnits(result.price.toString(), 18));
        this.logger.debug(`${this.logPrefix} resolved price: ${base}, ${quote}: ${result.price.toString()} / ${price}`);

        return <UniswapV3DataRepositoryInput>{
          value: price,
          timestamp: Number(results.timestamp),
          params: {
            base: poolsToFetch[ix].base,
            quote: poolsToFetch[ix].quote,
            amountInDecimals: poolsToFetch[ix].amountInDecimals,
            fromChain: chainId,
          },
        };
      })
      .filter((data) => data !== undefined) as UniswapV3DataRepositoryInput[];
  }

  private async getInput(): Promise<UniswapV3FetcherInputParams[]> {
    const key = FetchersMappingCacheKeys.UNISWAPV3_PARAMS;

    const cache = await this.mappingRepository.get(key);
    const cachedParams = JSON.parse(cache || '{}');

    return Object.keys(cachedParams).map((id) => {
      const {params} = <{params: UniswapV3FetcherInputParams}>cachedParams[id];
      return params;
    });
  }
}