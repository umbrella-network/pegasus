import {inject, injectable} from 'inversify';
import {Token} from '@uniswap/sdk-core';
import {FeeAmount, Pool, Tick, TICK_SPACINGS} from '@uniswap/v3-sdk';
// eslint-disable-next-line max-len
import IUniswapV3PoolABI from '@uniswap/v3-core/artifacts/contracts/interfaces/IUniswapV3Pool.sol/IUniswapV3Pool.json' assert {type: 'json'};
import {ethers} from 'ethers';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {UniswapV3TickQuery} from './UniswapV3TickQuery.js';
import {GraphTick} from './interfaces.js';
import {BlockchainProviderRepository} from '../../../repositories/BlockchainProviderRepository.js';
import {ActiveLiquititySDK} from './ActiveLiquiditySDK.js';

@injectable()
export class UniswapV3LiquidityCalculator {
  @inject(BlockchainProviderRepository) blockchainProviderRepository!: BlockchainProviderRepository;
  @inject(UniswapV3TickQuery) uniswapV3TickQuery!: UniswapV3TickQuery;
  @inject(ActiveLiquititySDK) activeLiquititySDK!: ActiveLiquititySDK;

  async apply(poolAddress: string, token0: Token, token1: Token, fee: FeeAmount, chainId: ChainsIds) {
    const provider = this.blockchainProviderRepository.get(chainId);
    const poolContract = new ethers.Contract(poolAddress, IUniswapV3PoolABI.abi, provider);

    const [slot0, liquidity, graphTicks] = await Promise.all([
      poolContract.slot0(),
      poolContract.liquidity(),
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

    const tickSpacing = TICK_SPACINGS[fee];
    const fullPool = new Pool(token0, token1, fee, slot0.sqrtPriceX96, liquidity, slot0.tick, sdkTicks);
    const activeTickIdx = Math.floor(fullPool.tickCurrent / tickSpacing) * tickSpacing;
    const numSurroundingTicks = 100;

    return await this.activeLiquititySDK.apply(
      activeTickIdx,
      fullPool.liquidity,
      tickSpacing,
      fullPool.token0,
      fullPool.token1,
      numSurroundingTicks,
      fullPool.fee,
      graphTicks,
    );
  }
}
