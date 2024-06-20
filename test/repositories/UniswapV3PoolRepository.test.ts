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

const {expect} = chai;

const tokenA = '0x123';
const tokenB = '0x234';
const tokenC = '0x233';
const poolAddressA = '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D8';
const poolAddressB = '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D1';
const poolAddressC = '0x8ad599c3A0ff1De082011EFDDc58f1908eb6e6D2';

const pool1 = {
  address: poolAddressA,
  protocol: 'uniswapV3',
  fee: 3000,
  token0: tokenA,
  token1: tokenB,
  chainId: ChainsIds.ETH,
};

const pool2 = {
  address: poolAddressB,
  protocol: 'uniswapV3',
  fee: 3000,
  token0: tokenB,
  token1: tokenA,
  chainId: ChainsIds.ETH,
};

const pool3 = {
  address: poolAddressC,
  protocol: 'uniswapV3',
  fee: 3000,
  token0: tokenA,
  token1: tokenC,
  chainId: ChainsIds.ETH,
};

const uniswapV3Pools = [pool1, pool2, pool3];

describe('UniswapV3PoolRepository', () => {
  let uniswapV3PoolRepository: UniswapV3PoolRepository;

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});

    const container = getTestContainer();

    const uniswapV3PoolModel = getModelForClass(UniswapV3Pool);

    await Promise.all(
      uniswapV3Pools.map((uniswapV3Pool) =>
        uniswapV3PoolModel.create({
          ...uniswapV3Pool,
        }),
      ),
    );

    container.bind(UniswapV3PoolRepository).to(UniswapV3PoolRepository);

    uniswapV3PoolRepository = container.get(UniswapV3PoolRepository);
  });

  afterEach(async () => {
    await getModelForClass(UniswapV3Pool).deleteMany({});
  });

  after(async () => {
    await mongoose.connection.close();
  });

  describe('find', () => {
    it('responds with matching tokens and ordered', async () => {
      const result = await uniswapV3PoolRepository.find({
        token0: tokenB,
        token1: tokenA,
        protocol: DexProtocolName.UNISWAP_V3,
        fromChain: [ChainsIds.ETH],
      });

      expect(result).to.be.an('array').with.lengthOf(2);
      expect(result[0]).to.include(pool1);
      expect(result[1]).to.include(pool2);

      const resultInverted = await uniswapV3PoolRepository.find({
        token0: tokenA,
        token1: tokenB,
        protocol: DexProtocolName.UNISWAP_V3,
        fromChain: [ChainsIds.ETH],
      });

      expect(result).to.be.an('array').with.lengthOf(2);
      expect(resultInverted[0]).to.include(pool1);
      expect(resultInverted[1]).to.include(pool2);
    });
  });
});
