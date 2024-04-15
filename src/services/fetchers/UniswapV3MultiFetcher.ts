import {StaticJsonRpcProvider} from '@ethersproject/providers';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {DexRepository} from '../../repositories/DexRepository.js';
import {DexProtocolName} from '../../types/DexProtocolName.js';
import {ChainsIds} from '../../types/ChainsIds.js';
import {ContractHelperRepository} from '../../repositories/ContractHelperRepository.js';
import {BigNumber} from 'ethers';

export type UniswapV3MultiFetcherParams = {
  token0: string;
  token1: string;
};

@injectable()
class UniswapV3MultiFetcher {
  provider: StaticJsonRpcProvider | undefined;
  logPrefix = '[UniswapV3MultiFetcher]';
  readonly dexProtocol = DexProtocolName.UNISWAP_V3;
  readonly chainId = ChainsIds.ETH;

  @inject('Logger') protected logger!: Logger;
  @inject(DexRepository) protected dexRepository!: DexRepository;
  @inject(ContractHelperRepository) contractRepository!: ContractHelperRepository;

  async apply(inputs: UniswapV3MultiFetcherParams[]): Promise<number[]> {
    this.logger.debug(`${this.logPrefix}: start with inputs ${inputs}`);

    const poolsToFetch: {
      pools: string[];
      base: string;
      quote: string;
    }[] = [];

    for (const input of inputs) {
      const {token0, token1} = input;
      this.logPrefix = '[UniswapV3MultiFetcher]';

      const data = await this.dexRepository.find({
        dexProtocol: this.dexProtocol,
        token0,
        token1,
      });

      const pools = data.map((item) => item.pool);

      poolsToFetch.push({pools, base: token0, quote: token1});
    }

    const prices = await this.fetchData(poolsToFetch);

    return prices;
  }

  private async fetchData(poolsToFetch: {pools: string[]; base: string; quote: string}[]): Promise<number[]> {
    const contract = this.contractRepository.get(this.chainId, this.dexProtocol).getContract();
    const [results] = (await contract.callStatic.getPrices(poolsToFetch)) as {success: boolean; price: BigNumber}[][];
    const outputs: number[] = [];
    this.logger.debug(`${this.logPrefix} fetched data: ${results}`);

    for (const [i, result] of results.entries()) {
      if (!result.success) {
        outputs.push(0);
        this.logger.debug(`${this.logPrefix} failed to fetch: ${poolsToFetch[i].base}, ${poolsToFetch[i].quote}: 0`);
        continue;
      }

      outputs.push(result.price.toNumber());

      this.logger.debug(
        `${this.logPrefix} resolved price: ${poolsToFetch[i].base}, ${poolsToFetch[i].quote}: ${result.price}`,
      );
    }

    return outputs;
  }
}

export default UniswapV3MultiFetcher;
