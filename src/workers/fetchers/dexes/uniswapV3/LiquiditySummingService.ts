import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import {Token} from '@uniswap/sdk-core';
import {FeeAmount} from '@uniswap/v3-sdk';
import JSBI from 'jsbi';

import {BarChartTick} from './interfaces.js';
import {ChainsIds} from '../../../../types/ChainsIds.js';
import {UniswapV3LiquidityCalculator} from './UniswapV3LiquidityCalculator.js';
import {SaveLiquidityParams} from '../../../../repositories/UniswapV3PoolRepository.js';

@injectable()
export class LiquiditySummingService {
  @inject('Logger') logger!: Logger;
  @inject(UniswapV3LiquidityCalculator) uniswapV3LiquidityCalculator!: UniswapV3LiquidityCalculator;

  async apply(
    poolAddress: string,
    token0: Token,
    token1: Token,
    fee: FeeAmount,
    chainId: ChainsIds,
  ): Promise<SaveLiquidityParams | undefined> {
    const logPrefix = `[LiquiditySummingService][${chainId}]`;
    const barChartTicks = await this.uniswapV3LiquidityCalculator.apply(poolAddress, token0, token1, fee, chainId);

    if (barChartTicks.length === 0) {
      this.logger.warn(`${logPrefix} No ticks found for pool ${poolAddress} ${token0.address}-${token1.address}`);
      return;
    }

    return this.getLiquiditySum(barChartTicks);
  }

  private async getLiquiditySum(createBarChartTicks: BarChartTick[]): Promise<SaveLiquidityParams | undefined> {
    const liquiditiesSum = {liquidityActive: '0', liquidityLockedToken0: 0, liquidityLockedToken1: 0};

    createBarChartTicks.forEach((curr) => {
      liquiditiesSum.liquidityActive = JSBI.add(
        JSBI.BigInt(liquiditiesSum.liquidityActive),
        JSBI.BigInt(curr.liquidityActive),
      ).toString();

      liquiditiesSum.liquidityLockedToken0 += curr.liquidityLockedToken0;
      liquiditiesSum.liquidityLockedToken1 += curr.liquidityLockedToken1;
    });

    return liquiditiesSum;
  }
}
