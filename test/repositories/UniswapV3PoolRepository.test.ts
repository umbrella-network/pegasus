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

const tokenA = '0x123';
const tokenB = '0x234';
const tokenC = '0x233';
const poolAddressA = '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8';
const poolAddressB = '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D1';
const poolAddressC = '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D2';
const oneDayInMs = 1 * 1000 * 60 * 60 * 24;

const pool1 = {
  address: poolAddressA,
  protocol: 'uniswapV3',
  fee: 3000,
  token0: tokenA,
  token1: tokenB,
  chainId: ChainsIds.ETH,
  liquidityActive: '2090386241959957974528',
  liquidityLockedToken0: 1.0000640218969976,
  liquidityLockedToken1: 29061.479326096796,
  liquidityUpdatedAt: new Date(Date.now() - oneDayInMs * 3), // Old updated Date
};

const pool2 = {
  address: poolAddressB,
  protocol: 'uniswapV3',
  fee: 3000,
  token0: tokenB,
  token1: tokenA,
  chainId: ChainsIds.ETH,
  liquidityActive: '2090386241959957974528',
  liquidityLockedToken0: 27061.479326096796,
  liquidityLockedToken1: 0.00006402189699766422,
  liquidityUpdatedAt: new Date(Date.now()),
};

const pool3 = {
  address: poolAddressC,
  protocol: 'uniswapV3',
  fee: 3000,
  token0: tokenA,
  token1: tokenC,
  chainId: ChainsIds.ETH,
  liquidityActive: '2090386241959957974528',
  liquidityLockedToken0: 17061.479326096796,
  liquidityLockedToken1: 0.00006402189699766422,
  liquidityUpdatedAt: new Date(Date.now()),
};

const pool4 = {
  address: poolAddressB,
  protocol: 'uniswapV3',
  fee: 500,
  token0: tokenA,
  token1: tokenB,
  chainId: ChainsIds.ETH,
  liquidityActive: '2090386241959957974528',
  liquidityLockedToken0: 17061.479326096796,
  liquidityLockedToken1: 0.00006402189699766422,
  liquidityUpdatedAt: new Date(Date.now()),
};

describe.only('UniswapV3PoolRepository', () => {
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
        token0: tokenB,
        token1: tokenA,
        protocol: DexProtocolName.UNISWAP_V3,
        fromChain: [ChainsIds.ETH],
      });

      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result[0]).to.include(lodash.omit(pool1, 'liquidityUpdatedAt'));
      expect(result[1]).to.include(lodash.omit(pool2, 'liquidityUpdatedAt'));

      const resultInverted = await uniswapV3PoolRepository.find({
        token0: tokenA,
        token1: tokenB,
        protocol: DexProtocolName.UNISWAP_V3,
        fromChain: [ChainsIds.ETH],
      });

      expect(result).to.be.an('array').with.lengthOf(2);
      expect(resultInverted[0]).to.include(lodash.omit(pool1, 'liquidityUpdatedAt'));
      expect(resultInverted[1]).to.include(lodash.omit(pool2, 'liquidityUpdatedAt'));
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

    it('responds with matching tokens with higher liquidity and fresh', async () => {
      const result = await uniswapV3PoolRepository.findBestPool({
        base: tokenA,
        quote: tokenB,
        protocol: DexProtocolName.UNISWAP_V3,
        fromChain: [ChainsIds.ETH],
      });

      expect(result).to.be.an('object');
      expect(result).to.deep.include(lodash.omit(pool2, 'liquidityUpdatedAt'));
    });
  });
});
