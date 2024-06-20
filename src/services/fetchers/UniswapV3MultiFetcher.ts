import {StaticJsonRpcProvider} from '@ethersproject/providers';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PoolRepository} from '../../repositories/PoolRepository.js';
import {DexProtocolName} from '../../types/Dexes.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {ContractHelperRepository} from '../../repositories/ContractHelperRepository.js';
import {BigNumber} from 'ethers';

export type UniswapV3MultiFetcherParams = {
  chainFrom: string[];
  token0: string;
  token1: string;
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
  @inject(PoolRepository) protected poolRepository!: PoolRepository;
  @inject(ContractHelperRepository) contractRepository!: ContractHelperRepository;

  async apply(inputs: UniswapV3MultiFetcherParams[]): Promise<OutputValues[]> {
    this.logger.debug(`${this.logPrefix}: start with inputs ${JSON.stringify(inputs)}`);

    const poolsToFetch = await this.getPoolsToFetch(inputs);

    if (poolsToFetch.length === 0) {
      this.logger.error(`${this.logPrefix} no data to fetch`);
      return [];
    }

    const prices = await this.fetchData(poolsToFetch);

    return prices;
  }

  public async getPoolsToFetch(inputs: UniswapV3MultiFetcherParams[]) {
    const poolsToFetch: {
      pools: string[];
      base: string;
      quote: string;
    }[] = [];

    for (const input of inputs) {
      const {chainFrom, token0, token1} = input;

      const data = await this.poolRepository.find({
        protocol: this.dexProtocol,
        chainFrom,
        token0,
        token1,
      });

      if (data.length === 0) {
        this.logger.error(`${this.logPrefix} no data found for ${token0}-${token1}`);
        continue;
      }

      this.logger.debug(`${this.logPrefix} data found ${token0}-${token1}`);
      const pools = data.map((item) => item.pool);
      poolsToFetch.push({pools, base: token0, quote: token1});
    }

    return poolsToFetch;
  }

  public async fetchData(poolsToFetch: {pools: string[]; base: string; quote: string}[]): Promise<OutputValues[]> {
    const contract = this.contractRepository.get(this.chainId, this.dexProtocol).getContract();
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
    poolsToFetch: {pools: string[]; base: string; quote: string}[],
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
