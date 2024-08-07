import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {BigNumber, ethers} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import {DexProtocolName} from '../../../types/Dexes.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {UniswapV3PoolRepository} from '../../../repositories/UniswapV3PoolRepository.js';
import {ContractAddressService} from '../../ContractAddressService.js';
import {PriceDataRepository} from '../../../repositories/PriceDataRepository.js';
import TimeService from '../../../services/TimeService.js';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherResult,
  FetcherName,
  FetchedValueType,
} from '../../../types/fetchers.js';
import {
  UniswapV3DataRepository,
  UniswapV3DataRepositoryInput,
} from '../../../repositories/fetchers/UniswapV3DataRepository.js';

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
class UniswapV3Fetcher implements FeedFetcherInterface {
  @inject(UniswapV3DataRepository) protected uniswapV3DataRepository!: UniswapV3DataRepository;
  @inject(UniswapV3PoolRepository) protected uniswapV3PoolRepository!: UniswapV3PoolRepository;
  @inject(ContractAddressService) contractAddressService!: ContractAddressService;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') protected logger!: Logger;

  private logPrefix = `[${FetcherName.UniswapV3}]`;

  readonly dexProtocol = DexProtocolName.UNISWAP_V3;
  static fetcherSource = '';

  async apply(params: UniswapV3FetcherInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    this.logger.debug(`${this.logPrefix}: start with inputs ${JSON.stringify(params)}`);

    const poolsToFetch = await this.getPoolsToFetch(params);

    if (poolsToFetch.size === 0) {
      this.logger.error(`${this.logPrefix} no pools for ${JSON.stringify(params)}`);
      return {prices: []};
    }

    const totalPools = Object.keys(poolsToFetch).reduce(
      (sum, k) => sum + (poolsToFetch.get(k as ChainsIds)?.length || 0),
      0,
    );

    if (totalPools != params.length) {
      this.logger.warn(`${this.logPrefix} ${params.length - totalPools} pools are missing ${JSON.stringify(params)}`);
    }

    await Promise.all([...poolsToFetch.entries()].map(([chainId, pools]) => this.fetchData(chainId, pools)));

    const timestamp = options.timestamp ?? this.timeService.apply();
    const prices = await this.uniswapV3DataRepository.getPrices(params, timestamp);

    const fetcherResult = {prices, timestamp};

    await this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.UniswapV3,
      FetchedValueType.Price,
      UniswapV3Fetcher.fetcherSource,
    );

    return fetcherResult;
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

      if (!chainPools) {
        helperInputMap.set(currentChainId, [helperInput]);
        continue;
      }

      chainPools.push(helperInput);
      helperInputMap.set(currentChainId, chainPools);
    }

    return helperInputMap;
  }

  private async fetchData(chainId: ChainsIds, poolsToFetch: UniswapV3ContractHelperInput[]): Promise<void> {
    const abi = JSON.parse(readFileSync(__dirname + '/UniswapV3FetcherHelper.abi.json', 'utf-8')).abi as never;
    const contract = await this.contractAddressService.getContract(chainId, 'UniswapV3FetcherHelper', abi);

    let parsed: UniswapV3DataRepositoryInput[] = [];

    try {
      const response = await contract.callStatic.getPrices(poolsToFetch);
      parsed = this.processResult(chainId, response, poolsToFetch);
    } catch (error) {
      this.logger.error(`${this.logPrefix} [${chainId}] getPrices failed: ${error}`);
    }

    try {
      await this.uniswapV3DataRepository.save(parsed);
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
}

export default UniswapV3Fetcher;
