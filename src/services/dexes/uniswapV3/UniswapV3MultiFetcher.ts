import {StaticJsonRpcProvider} from '@ethersproject/providers';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {BigNumber, Contract} from 'ethers';
import {BaseProvider} from '@ethersproject/providers';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import {DexProtocolName} from '../../../types/Dexes.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {UniswapV3PoolRepository} from '../../../repositories/UniswapV3PoolRepository.js';
import {RegistryContractFactory} from '../../../factories/contracts/RegistryContractFactory.js';
import {BlockchainProviderRepository} from '../../../repositories/BlockchainProviderRepository.js';
import {BlockchainRepository} from '../../../repositories/BlockchainRepository.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type UniswapV3MultiFetcherParams = {
  fromChain: string[];
  token0: string;
  token1: string;
  amountInDecimals: number;
};

type UniswapV3ContractHelperInput = {
  pool: string;
  base: string;
  quote: string;
  amountInDecimals: number;
};
export interface OutputValues {
  token0: string;
  token1: string;
  value: number;
}

@injectable()
class UniswapV3MultiFetcher {
  provider: StaticJsonRpcProvider | undefined;
  logPrefix = '[UniswapV3MultiFetcher]';
  readonly dexProtocol = DexProtocolName.UNISWAP_V3;
  readonly chainId = ChainsIds.ETH;

  @inject('Logger') protected logger!: Logger;
  @inject(UniswapV3PoolRepository) protected uniswapV3PoolRepository!: UniswapV3PoolRepository;
  @inject(BlockchainProviderRepository) blockchainProviderRepository!: BlockchainProviderRepository;
  @inject(BlockchainRepository) blockchainRepository!: BlockchainRepository;

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

    for (const input of inputs) {
      const {fromChain, token0, token1, amountInDecimals} = input;

      const data = await this.uniswapV3PoolRepository.findStrictPair({
        protocol: this.dexProtocol,
        fromChain,
        token0,
        token1,
      });

      if (data.length === 0) {
        this.logger.error(`${this.logPrefix} no data found for ${token0}-${token1}`);
        continue;
      }

      this.logger.debug(`${this.logPrefix} data found ${token0}-${token1}`);

      data.forEach((item) => {
        const helperInput = {pool: item.address, base: token0, quote: token1, amountInDecimals};
        const currentChainId = item.chainId as ChainsIds;
        const chainPools = helperInputMap.get(currentChainId);

        if (!chainPools) {
          helperInputMap.set(currentChainId, [helperInput]);
          return;
        }

        chainPools.push(helperInput);
        helperInputMap.set(currentChainId, chainPools);
      });
    }

    return helperInputMap;
  }

  public async fetchData(
    chainId: ChainsIds,
    poolsToFetch: {pool: string; base: string; quote: string; amountInDecimals: number}[],
  ): Promise<OutputValues[]> {
    const abi = JSON.parse(readFileSync(__dirname + '/UniswapV3FetcherHelper.abi.json', 'utf-8')).abi as never;

    const blockchain = this.blockchainRepository.get(chainId);
    const registry = RegistryContractFactory.create(blockchain);
    const contractAddress = await registry.getAddress('UniswapV3FetcherHelper');

    const provider = blockchain.provider.getRawProviderSync<BaseProvider>();
    const contract = new Contract(contractAddress, abi, provider);
    const [results] = (await contract.callStatic.getPrices(poolsToFetch)) as {success: boolean; price: BigNumber}[][];
    this.logger.debug(`${this.logPrefix} fetched data: ${results}`);

    if (results.length === 0) {
      this.logger.error(`${this.logPrefix} no data fetched`);
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
        outputs.push({token0: poolsToFetch[i].base, token1: poolsToFetch[i].quote, value: 0});
        this.logger.debug(`${this.logPrefix} failed to fetch: ${poolsToFetch[i].base}, ${poolsToFetch[i].quote}: 0`);
        continue;
      }

      outputs.push({token0: poolsToFetch[i].base, token1: poolsToFetch[i].quote, value: result.price.toNumber()});

      this.logger.debug(
        `${this.logPrefix} resolved price: ${poolsToFetch[i].base}, ${poolsToFetch[i].quote}: ${result.price}`,
      );
    }

    return outputs;
  }
}

export default UniswapV3MultiFetcher;
