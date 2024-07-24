import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {BigNumber, ethers} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import {DexProtocolName} from '../../../types/Dexes.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {UniswapV3PoolRepository} from '../../../repositories/UniswapV3PoolRepository.js';
import {ContractAddressService} from '../../../services/ContractAddressService.js';
import {PriceDataRepository, PriceValueType} from '../../../repositories/PriceDataRepository.js';
import TimeService from '../../../services/TimeService.js';

import {
  FeedMultiFetcherInterface,
  FeedMultiFetcherOptions,
  FetcherResult,
  NumberOrUndefined,
  FetcherName,
} from '../../../types/fetchers.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type UniswapV3MultiFetcherParams = {
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

@injectable()
class UniswapV3MultiFetcher implements FeedMultiFetcherInterface {
  @inject(UniswapV3PoolRepository) protected uniswapV3PoolRepository!: UniswapV3PoolRepository;
  @inject(ContractAddressService) contractAddressService!: ContractAddressService;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') protected logger!: Logger;

  readonly dexProtocol = DexProtocolName.UNISWAP_V3;
  static fetcherSource = '';

  async apply(inputs: UniswapV3MultiFetcherParams[], options: FeedMultiFetcherOptions): Promise<FetcherResult> {
    this.logger.debug(`[UniswapV3MultiFetcher]: start with inputs ${JSON.stringify(inputs)}`);

    if (inputs.length === 0) {
      this.logger.debug('[UniswapV3MultiFetcher] no inputs to fetch');
      return {prices: []};
    }

    const poolsToFetch = await this.getPoolsToFetch(inputs);

    if (poolsToFetch.size === 0) {
      this.logger.error(`[UniswapV3MultiFetcher] no data to fetch ${JSON.stringify(inputs)}`);
      return {prices: []};
    }

    const prices = await Promise.all(
      [...poolsToFetch.entries()].map(([chainId, pools]) => this.fetchData(chainId, pools)),
    );

    const fetcherResult = {prices: prices.flat(), timestamp: this.timeService.apply()};

    this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.UNISWAP_V3,
      PriceValueType.Price,
      UniswapV3MultiFetcher.fetcherSource,
    );

    return fetcherResult;
  }

  private async getPoolsToFetch(
    inputs: UniswapV3MultiFetcherParams[],
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
        this.logger.error(`[UniswapV3MultiFetcher] no pool found for ${base}-${quote}`);
        continue;
      }

      this.logger.debug(`[UniswapV3MultiFetcher] pool found ${base}-${quote}: ${JSON.stringify(pool)}`);

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

  private async fetchData(
    chainId: ChainsIds,
    poolsToFetch: {pool: string; base: string; quote: string; amountInDecimals: number}[],
  ): Promise<NumberOrUndefined[]> {
    const abi = JSON.parse(readFileSync(__dirname + '/UniswapV3FetcherHelper.abi.json', 'utf-8')).abi as never;
    const contract = await this.contractAddressService.getContract(chainId, 'UniswapV3FetcherHelper', abi);

    try {
      const [results] = (await contract.callStatic.getPrices(poolsToFetch)) as {success: boolean; price: BigNumber}[][];
      this.logger.debug(`[UniswapV3MultiFetcher] fetched data: ${results}`);

      if (results.length === 0) {
        this.logger.error('[UniswapV3MultiFetcher] no data fetched');
        return [];
      }

      return this.processResult(results, poolsToFetch);
    } catch (error) {
      this.logger.error(`[UniswapV3MultiFetcher] getPrices failed: ${error}`);
    }

    return [];
  }

  private processResult(
    results: {success: boolean; price: BigNumber}[],
    poolsToFetch: {pool: string; base: string; quote: string; amountInDecimals: number}[],
  ): NumberOrUndefined[] {
    const outputs: NumberOrUndefined[] = [];

    for (const [i, result] of results.entries()) {
      const {base, quote} = poolsToFetch[i];

      if (!result.success) {
        outputs.push(undefined);
        this.logger.error(`[UniswapV3MultiFetcher] failed to fetch: ${base}, ${quote}`);
        continue;
      }

      outputs.push(Number(ethers.utils.formatUnits(result.price.toString(), 18)));

      this.logger.debug(`[UniswapV3MultiFetcher] resolved price: ${base}, ${quote}: ${result.price.toString()}`);
    }

    return outputs;
  }
}

export default UniswapV3MultiFetcher;
