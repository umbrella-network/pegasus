import {inject, injectable} from 'inversify';
import {Token} from '@uniswap/sdk-core';
import {FeeAmount, Pool, Tick, TICK_SPACINGS} from '@uniswap/v3-sdk';
import {readFileSync} from 'fs';
import {fileURLToPath} from 'url';
import path from 'path';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {UniswapV3TickQuery} from './UniswapV3TickQuery.js';
import {BarChartTick, GraphTick} from './interfaces.js';
import {BlockchainProviderRepository} from '../../../repositories/BlockchainProviderRepository.js';
import {ActiveLiquititySDK} from './ActiveLiquiditySDK.js';
import {ContractAddressService} from '../../../services/ContractAddressService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@injectable()
export class UniswapV3LiquidityCalculator {
  @inject(BlockchainProviderRepository) blockchainProviderRepository!: BlockchainProviderRepository;
  @inject(UniswapV3TickQuery) uniswapV3TickQuery!: UniswapV3TickQuery;
  @inject(ActiveLiquititySDK) activeLiquititySDK!: ActiveLiquititySDK;
  @inject(ContractAddressService) contractAddressService!: ContractAddressService;

  async apply(
    poolAddress: string,
    token0: Token,
    token1: Token,
    fee: FeeAmount,
    chainId: ChainsIds,
  ): Promise<BarChartTick[]> {
    const abi = JSON.parse(readFileSync(__dirname + '/UniswapV3FetcherHelper.abi.json', 'utf-8')).abi as never;
    const poolContract = await this.contractAddressService.getContract(chainId, 'UniswapV3FetcherHelper', abi);

    const [liquidityData, graphTicks] = await Promise.all([
      poolContract.liquidityData([poolAddress]),
      this.uniswapV3TickQuery.apply(poolAddress, chainId),
    ]);

    if (graphTicks.length === 0) {
      return [];
    }

    const sdkTicks = graphTicks.map((graphTick: GraphTick) => {
      return new Tick({
        index: +graphTick.tickIdx,
        liquidityGross: graphTick.liquidityGross,
        liquidityNet: graphTick.liquidityNet,
      });
    });

    const {sqrtPriceX96, liquidity, tick} = liquidityData;
    const tickSpacing = TICK_SPACINGS[fee];
    const fullPool = new Pool(token0, token1, fee, sqrtPriceX96, liquidity, tick, sdkTicks);

    // reference: https://docs.uniswap.org/sdk/v3/guides/advanced/active-liquidity#calculating-active-liquidity
    const activeTickIdx = Math.floor(fullPool.tickCurrent / tickSpacing) * tickSpacing;
    const numSurroundingTicks = 100;

    return await this.activeLiquititySDK.apply(
      activeTickIdx,
      fullPool.liquidity,
      tickSpacing,
      token1,
      token0,
      numSurroundingTicks,
      fee,
      graphTicks,
    );
  }
}
