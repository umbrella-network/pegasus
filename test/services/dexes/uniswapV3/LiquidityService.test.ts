/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import sinon from 'sinon';
import chai from 'chai';
import {ChainId, Token} from '@uniswap/sdk-core';

import {mockedLogger} from '../../../mocks/logger.js';
import Settings from '../../../../src/types/Settings.js';
import {getTestContainer} from '../../../helpers/getTestContainer.js';
import {ChainsIds} from '../../../../src/types/ChainsIds.js';
import {UniswapV3LiquidityCalculator} from '../../../../src/workers/fetchers/dexes/uniswapV3/UniswapV3LiquidityCalculator.js';
import {LiquiditySummingService} from '../../../../src/workers/fetchers/dexes/uniswapV3/LiquiditySummingService.js';

const {expect} = chai;

describe('LiquiditySummingService', () => {
  let mockedUniswapV3LiquidityCalculator: sinon.SinonStubbedInstance<UniswapV3LiquidityCalculator>;
  let liquiditySummingService: LiquiditySummingService;
  let settings: Settings;

  beforeEach(async () => {
    const container = getTestContainer();

    const barChartTicks = [
      {
        tickIdx: 99,
        liquidityActive: 0,
        liquidityLockedToken0: 50,
        liquidityLockedToken1: 200,
        price0: 0,
        price1: 0,
        isCurrent: false,
      },
      {
        tickIdx: 100,
        liquidityActive: 100,
        liquidityLockedToken0: 150,
        liquidityLockedToken1: 200,
        price0: 1,
        price1: 2,
        isCurrent: true,
      },
      {
        tickIdx: 101,
        liquidityActive: 100,
        liquidityLockedToken0: 300,
        liquidityLockedToken1: 100,
        price0: 3,
        price1: 2,
        isCurrent: false,
      },
    ];

    mockedUniswapV3LiquidityCalculator = sinon.createStubInstance(UniswapV3LiquidityCalculator);
    mockedUniswapV3LiquidityCalculator.apply.resolves(barChartTicks);

    container.rebind('Logger').toConstantValue(mockedLogger);
    container.rebind('Settings').toConstantValue(settings);
    container.bind(UniswapV3LiquidityCalculator).toConstantValue(mockedUniswapV3LiquidityCalculator);

    liquiditySummingService = container.get(LiquiditySummingService);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#apply', () => {
    it('returns the liquidity', async () => {
      const poolAddress = '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8';
      const fee = 3000;
      const token0Address = '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2';
      const token1Address = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599';
      const chainId = ChainsIds.ETH;

      const token0 = new Token(ChainId.MAINNET, token0Address, 18, 'TEST', 'TESTING');
      const token1 = new Token(ChainId.MAINNET, token1Address, 18, 'TEST 2', 'TESTING 2');

      const tickSum = await liquiditySummingService.apply(poolAddress, token0, token1, fee, chainId);

      expect(tickSum).to.eql({
        liquidityActive: '200',
        liquidityLockedToken0: 500,
        liquidityLockedToken1: 500,
      });
    });
  });
});
