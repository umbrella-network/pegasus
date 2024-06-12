import {StaticJsonRpcProvider} from '@ethersproject/providers';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {BigNumber} from 'ethers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import {DexProtocolName} from '../../../types/Dexes.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {UniswapV3PoolRepository} from '../../../repositories/UniswapV3PoolRepository.js';
import Settings from '../../../types/Settings.js';
import {ContractAddressService} from '../../../services/ContractAddressService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type UniswapV3MultiFetcherParams = {
  fromChain: string[];
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
export interface OutputValues {
  base: string;
  quote: string;
  value: number;
}

@injectable()
class UniswapV3MultiFetcher {
  provider: StaticJsonRpcProvider | undefined;
  readonly dexProtocol = DexProtocolName.UNISWAP_V3;

  @inject('Logger') protected logger!: Logger;
  @inject('Settings') protected settings!: Settings;
  @inject(UniswapV3PoolRepository) protected uniswapV3PoolRepository!: UniswapV3PoolRepository;
  @inject(ContractAddressService) contractAddressService!: ContractAddressService;

  async apply(inputs: UniswapV3MultiFetcherParams[]): Promise<OutputValues[]> {
    this.logger.debug(`[UniswapV3MultiFetcher]: start with inputs ${JSON.stringify(inputs)}`);

    const poolsToFetch = await this.getPoolsToFetch(inputs);

    if (poolsToFetch.size === 0) {
      this.logger.error('[UniswapV3MultiFetcher] no data to fetch');
      return [];
    }

    const prices = await Promise.all(
      [...poolsToFetch.entries()].map(([chainId, pools]) => this.fetchData(chainId, pools)),
    );

    return prices.flat();
  }

  public async getPoolsToFetch(
    inputs: UniswapV3MultiFetcherParams[],
  ): Promise<Map<ChainsIds, UniswapV3ContractHelperInput[]>> {
    const helperInputMap: Map<ChainsIds, UniswapV3ContractHelperInput[]> = new Map();
    const liquidityFreshness = this.settings.api.liquidityFreshness;
    const liquidityUpdatedLimit = new Date(Date.now() - liquidityFreshness);

    for (const input of inputs) {
      const {fromChain, base, quote, amountInDecimals} = input;

      const data = await this.uniswapV3PoolRepository.findUpdatedLiquidity({
        protocol: this.dexProtocol,
        fromChain,
        base,
        quote,
        liquidityUpdatedLimit,
      });

      if (!data) {
        this.logger.error(`[UniswapV3MultiFetcher] no data found for ${base}-${quote}`);
        continue;
      }

      this.logger.debug(`[UniswapV3MultiFetcher] data found ${base}-${quote}`);

      const helperInput = {pool: data.address, base, quote, amountInDecimals};
      const currentChainId = data.chainId as ChainsIds;
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

  public async fetchData(
    chainId: ChainsIds,
    poolsToFetch: {pool: string; base: string; quote: string; amountInDecimals: number}[],
  ): Promise<OutputValues[]> {
    const abi = JSON.parse(readFileSync(__dirname + '/UniswapV3FetcherHelper.abi.json', 'utf-8')).abi as never;
    const contract = await this.contractAddressService.getContract(chainId, 'UniswapV3FetcherHelper', abi);
    const [results] = (await contract.callStatic.getPrices(poolsToFetch)) as {success: boolean; price: BigNumber}[][];
    this.logger.debug(`[UniswapV3MultiFetcher] fetched data: ${results}`);

    if (results.length === 0) {
      this.logger.error('[UniswapV3MultiFetcher] no data fetched');
      return [];
    }

    return this.processResult(results, poolsToFetch);
  }

  public processResult(
    results: {success: boolean; price: BigNumber}[],
    poolsToFetch: {pool: string; base: string; quote: string; amountInDecimals: number}[],
  ) {
    const outputs: OutputValues[] = [];

    for (const [i, result] of results.entries()) {
      if (!result.success) {
        outputs.push({base: poolsToFetch[i].base, quote: poolsToFetch[i].quote, value: 0});
        this.logger.debug(
          `[UniswapV3MultiFetcher] failed to fetch: ${poolsToFetch[i].base}, ${poolsToFetch[i].quote}: 0`,
        );
        continue;
      }

      outputs.push({base: poolsToFetch[i].base, quote: poolsToFetch[i].quote, value: result.price.toNumber()});

      this.logger.debug(
        `[UniswapV3MultiFetcher] resolved price: ${poolsToFetch[i].base}, ${poolsToFetch[i].quote}: ${result.price}`,
      );
    }

    return outputs;
  }
}

export default UniswapV3MultiFetcher;
