import {Logger} from 'winston';
import {inject, injectable} from 'inversify';
import {Token} from '@uniswap/sdk-core';
import {FeeAmount} from '@uniswap/v3-sdk';
import JSBI from 'jsbi';

import {BarChartTick} from './interfaces.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {UniswapV3LiquidityCalculator} from './UniswapV3LiquidityCalculator.js';

@injectable()
export class LiquidityService {
  @inject('Logger') logger!: Logger;
  @inject(UniswapV3LiquidityCalculator) uniswapV3LiquidityCalculator!: UniswapV3LiquidityCalculator;

  async apply(poolAddress: string, token0: Token, token1: Token, fee: FeeAmount, chainId: ChainsIds) {
    const barChartTicks = await this.uniswapV3LiquidityCalculator.apply(poolAddress, token0, token1, fee, chainId);

    if (barChartTicks.length === 0) {
      return;
    }

    return this.getLiquiditySum(barChartTicks);
  }

  private async getLiquiditySum(createBarChartTicks: BarChartTick[]) {
    const poolSum = {liquidityActive: '0', liquidityLockedToken0: 0, liquidityLockedToken1: 0};

    createBarChartTicks.forEach((curr) => {
      poolSum.liquidityActive = JSBI.add(
        JSBI.BigInt(poolSum.liquidityActive),
        JSBI.BigInt(curr.liquidityActive),
      ).toString();

      poolSum.liquidityLockedToken0 += curr.liquidityLockedToken0;
      poolSum.liquidityLockedToken1 += curr.liquidityLockedToken1;
    });

    return poolSum;
  }
}
