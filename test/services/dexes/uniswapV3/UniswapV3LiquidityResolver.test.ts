/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import sinon from 'sinon';
import chai from 'chai';
import {getModelForClass} from '@typegoose/typegoose';
import {mongoose} from '@typegoose/typegoose';
import {DotenvParseOutput} from 'dotenv';

import {mockedLogger} from '../../../mocks/logger.js';
import {getTestContainer} from '../../../helpers/getTestContainer.js';
import {ChainsIds} from '../../../../src/types/ChainsIds.js';
import {LiquiditySummingService} from '../../../../src/services/dexes/uniswapV3/LiquiditySummingService.js';
import {UniswapV3PoolRepository} from '../../../../src/repositories/UniswapV3PoolRepository.js';
import {UniswapV3LiquidityResolver} from '../../../../src/services/dexes/uniswapV3/UniswapV3LiquidityResolver.js';
import {loadTestEnv} from '../../../helpers/loadTestEnv.js';
import {UniswapV3Pool} from '../../../../src/models/UniswapV3Pool.js';
import {FeedDataService} from '../../../../src/services/FeedDataService.js';
import {Token} from '../../../../src/models/Token.js';
import {FetcherName} from '../../../../src/types/fetchers.js';

const {expect} = chai;

const uniswapV3Pool = {
  address: '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8',
  protocol: 'uniswapV3',
  fee: 3000,
  token0: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
  token1: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  chainId: ChainsIds.ETH,
};

describe('UniswapV3LiquidityResolver', () => {
  let mockedLiquiditySummingService: sinon.SinonStubbedInstance<LiquiditySummingService>;
  let mockedFeedDataService: sinon.SinonStubbedInstance<FeedDataService>;
  let uniswapV3LiquidityResolver: UniswapV3LiquidityResolver;
  let uniswapV3PoolRepository: UniswapV3PoolRepository;
  let config: DotenvParseOutput;

  before(async () => {
    config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});

    await Promise.all([
      getModelForClass(UniswapV3Pool).create({
        ...uniswapV3Pool,
        createdDate: new Date(2024, 0, 1),
      }),
      getModelForClass(Token).create([
        {
          chainId: 'ethereum',
          address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
          symbol: 'WETH',
          name: 'Wrapped Ether',
          decimals: 18,
        },
        {
          chainId: 'ethereum',
          address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
          symbol: 'WBTC',
          name: 'Wrapped',
          decimals: 18,
        },
      ]),
    ]);

    const container = getTestContainer();

    mockedFeedDataService = sinon.createStubInstance(FeedDataService);
    mockedFeedDataService.getParamsByFetcherName.returns([
      {
        fromChain: ChainsIds.ETH,
        base: uniswapV3Pool.token0,
        quote: uniswapV3Pool.token1,
      },
    ]);

    mockedFeedDataService.apply.resolves({
      feeds: {
        firstClassLeaves: [
          {
            label: 'WETH-WBTC',
            valueBytes: '0x000',
          },
        ],
        leaves: [
          {
            label: 'WETH-WBTC',
            valueBytes: '0x000',
          },
        ],
        fcdsFeeds: {
          ['WETH-WBTC']: {
            discrepancy: 1,
            precision: 2,
            inputs: [
              {
                fetcher: {
                  name: FetcherName.UniswapV3,
                  params: {
                    fromChain: 'ethereum',
                    quote: uniswapV3Pool.token0,
                    base: uniswapV3Pool.token1,
                    amountInDecimals: 8,
                  },
                },
              },
            ],
          },
        },
        leavesFeeds: {
          ['WETH-WBTC']: {
            discrepancy: 1,
            precision: 2,
            inputs: [
              {
                fetcher: {
                  name: FetcherName.UniswapV3,
                  params: {
                    fromChain: 'ethereum',
                    quote: uniswapV3Pool.token0,
                    base: uniswapV3Pool.token1,
                    amountInDecimals: 8,
                  },
                },
              },
            ],
          },
        },
      },
    });

    mockedLiquiditySummingService = sinon.createStubInstance(LiquiditySummingService);

    mockedLiquiditySummingService.apply.resolves({
      liquidityActive: '200',
      liquidityLockedToken0: 500,
      liquidityLockedToken1: 500,
    });

    container.rebind('Logger').toConstantValue(mockedLogger);
    container.bind(LiquiditySummingService).toConstantValue(mockedLiquiditySummingService);
    container.bind(FeedDataService).toConstantValue(mockedFeedDataService);

    uniswapV3PoolRepository = container.get(UniswapV3PoolRepository);
    uniswapV3LiquidityResolver = container.get(UniswapV3LiquidityResolver);
  });

  afterEach(() => {
    sinon.restore();
  });

  after(async () => {
    await getModelForClass(UniswapV3Pool).deleteMany({});
    await getModelForClass(Token).deleteMany({});
    await mongoose.connection.close();
  });

  describe.skip('#apply', () => {
    it('saves the liquidity in pool', async () => {
      await uniswapV3LiquidityResolver.apply(ChainsIds.ETH);

      const poolUpdate = await uniswapV3PoolRepository.find({
        protocol: uniswapV3Pool.protocol,
        fromChain: uniswapV3Pool.chainId,
        token0: uniswapV3Pool.token0,
        token1: uniswapV3Pool.token1,
      });

      expect(poolUpdate).to.be.an('array').that.has.lengthOf(1);
      expect(poolUpdate[0]).to.include({
        ...uniswapV3Pool,
        liquidityActive: '200',
        liquidityLockedToken0: 500,
        liquidityLockedToken1: 500,
      });
    });
  });
});
