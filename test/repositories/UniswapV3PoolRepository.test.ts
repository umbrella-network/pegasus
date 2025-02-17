import 'reflect-metadata';
import chai from 'chai';
import {getModelForClass} from '@typegoose/typegoose';
import mongoose from 'mongoose';

import {UniswapV3PoolRepository} from '../../src/repositories/UniswapV3PoolRepository.js';
import {loadTestEnv} from '../helpers/loadTestEnv.js';
import {getTestContainer} from '../helpers/getTestContainer.js';
import {UniswapV3Pool} from '../../src/models/UniswapV3Pool.js';
import {ChainsIds} from '../../src/types/ChainsIds.js';
import {DexProtocolName} from '../../src/types/Dexes.js';
import lodash from 'lodash';
import Settings from '../../src/types/Settings.js';

const {expect} = chai;

const tokenA = '0xtokenA';
const tokenB = '0xtokenB';
const tokenC = '0xtokenC';
const poolAddress1 = '0x1ad599c3A0ff1De082011EFDDc58f1908eb6e6D8'.toLowerCase();
const poolAddress2 = '0x2ad599c3A0ff1De082011EFDDc58f1908eb6e6D1'.toLowerCase();
const poolAddress3 = '0x3ad599c3A0ff1De082011EFDDc58f1908eb6e6D2'.toLowerCase();
const poolAddress4 = '0x4ad599c3A0ff1De082011EFDDc58f1908eb6e6D2'.toLowerCase();
const oneDayInMs = 1 * 1000 * 60 * 60 * 24;

const pool1 = {
  address: poolAddress1,
  protocol: 'uniswapV3',
  fee: 3000,
  token0: tokenA,
  token1: tokenB,
  chainId: ChainsIds.ETH,
  liquidityLockedToken0: 0.640218969976,
  liquidityLockedToken1: 29061.479326096796,
  liquidityUpdatedAt: new Date(Date.now() - oneDayInMs * 3), // Old updated Date
};

const pool2 = {
  address: poolAddress2,
  protocol: 'uniswapV3',
  fee: 3000,
  token0: tokenB,
  token1: tokenA,
  chainId: ChainsIds.ETH,
  liquidityLockedToken0: 27061.479326096796,
  liquidityLockedToken1: 0.7402189699,
  liquidityUpdatedAt: new Date(Date.now()),
};

const pool3 = {
  address: poolAddress3,
  protocol: 'uniswapV3',
  fee: 3000,
  token0: tokenA,
  token1: tokenC,
  chainId: ChainsIds.ETH,
  liquidityLockedToken0: 17061.479326096796,
  liquidityLockedToken1: 0.6402189699,
  liquidityUpdatedAt: new Date(Date.now()),
};

const pool4 = {
  address: poolAddress4,
  protocol: 'uniswapV3',
  fee: 500,
  token0: tokenA,
  token1: tokenB,
  chainId: ChainsIds.ETH,
  liquidityLockedToken0: 0.9402189699,
  liquidityLockedToken1: 17061.479326096796,
  liquidityUpdatedAt: new Date(Date.now()),
};

describe('UniswapV3PoolRepository', () => {
  let uniswapV3PoolRepository: UniswapV3PoolRepository;
  let settings: Settings;

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});

    const container = getTestContainer();

    settings = {
      dexes: {
        [ChainsIds.ETH]: {
          [DexProtocolName.UNISWAP_V3]: {
            liquidityFreshness: oneDayInMs,
          },
        },
      },
    } as Settings;

    container.bind(UniswapV3PoolRepository).to(UniswapV3PoolRepository);
    container.rebind('Settings').toConstantValue(settings);

    uniswapV3PoolRepository = container.get(UniswapV3PoolRepository);
  });

  after(async () => {
    await mongoose.connection.close();
  });

  describe('find', () => {
    before(async () => {
      const uniswapV3Pools = [pool1, pool2, pool3];

      const uniswapV3PoolModel = getModelForClass(UniswapV3Pool);

      await Promise.all(
        uniswapV3Pools.map((uniswapV3Pool) =>
          uniswapV3PoolModel.create({
            ...uniswapV3Pool,
          }),
        ),
      );
    });

    after(async () => {
      await getModelForClass(UniswapV3Pool).deleteMany({});
    });

    it('responds with matching tokens and ordered', async () => {
      const result = await uniswapV3PoolRepository.find({
        tokens: [{base: tokenA, quote: tokenB}],
        protocol: DexProtocolName.UNISWAP_V3,
        fromChain: ChainsIds.ETH,
      });

      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result[0].address).eq(pool1.address);
      expect(result[1].address).eq(pool2.address);

      const resultInverted = await uniswapV3PoolRepository.find({
        tokens: [{base: tokenA, quote: tokenB}],
        protocol: DexProtocolName.UNISWAP_V3,
        fromChain: ChainsIds.ETH,
      });

      expect(result).to.be.an('array').with.lengthOf(2);
      expect(resultInverted[0].address).eq(pool1.address);
      expect(resultInverted[1].address).eq(pool2.address);
    });
  });

  describe('findBestPool', () => {
    before(async () => {
      const uniswapV3Pools = [pool1, pool2, pool3, pool4];

      const uniswapV3PoolModel = getModelForClass(UniswapV3Pool);

      await Promise.all(
        uniswapV3Pools.map((uniswapV3Pool) =>
          uniswapV3PoolModel.create({
            ...uniswapV3Pool,
          }),
        ),
      );
    });

    after(async () => {
      await getModelForClass(UniswapV3Pool).deleteMany({});
    });

    it('finds best pools for tokenA', async () => {
      const result = await uniswapV3PoolRepository.findBestPool({
        base: tokenB,
        quote: tokenA,
        protocol: DexProtocolName.UNISWAP_V3,
        fromChain: ChainsIds.ETH,
      });

      expect(result).to.be.an('object');
      expect(result?.address).eq(pool4.address);
    });

    it('finds best pools for tokenB', async () => {
      const result = await uniswapV3PoolRepository.findBestPool({
        base: tokenA,
        quote: tokenB,
        protocol: DexProtocolName.UNISWAP_V3,
        fromChain: ChainsIds.ETH,
      });

      expect(result).to.be.an('object');
      expect(result?.address).eq(pool2.address);
    });
  });
});
