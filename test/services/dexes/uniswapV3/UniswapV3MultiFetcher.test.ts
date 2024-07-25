import {Container} from 'inversify';
import {BigNumber} from 'ethers';
import sinon from 'sinon';
import chai from 'chai';

import UniswapV3MultiFetcher, {
  UniswapV3MultiFetcherParams,
} from '../../../../src/services/dexes/uniswapV3/UniswapV3MultiFetcher.js';

import {UniswapV3PoolRepository} from '../../../../src/repositories/UniswapV3PoolRepository.js';
import {BlockchainRepository} from '../../../../src/repositories/BlockchainRepository.js';
import {ContractAddressService} from '../../../../src/services/ContractAddressService.js';
import {getTestContainer} from '../../../helpers/getTestContainer.js';
import {UniswapV3Pool} from '../../../../src/models/UniswapV3Pool.js';
import {DexProtocolName} from '../../../../src/types/Dexes.js';
import {ChainsIds} from '../../../../src/types/ChainsIds.js';
import {loadTestEnv} from '../../../helpers/loadTestEnv.js';

const {expect} = chai;

describe('UniswapV3MultiFetcher', () => {
  let uniswapV3MultiFetcher: UniswapV3MultiFetcher;
  let container: Container;
  let mockedUniswapV3PoolRepository: sinon.SinonStubbedInstance<UniswapV3PoolRepository>;
  let mockedContractAddressService: sinon.SinonStubbedInstance<ContractAddressService>;
  let mockedContract: sinon.SinonStubbedInstance<any>;

  const tokenTest0 = '0x01ac9633f13aa16e0f8d4514c806a55f9e9abd01';
  const tokenTest1 = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14';
  const tokenTest2 = '0x01d69ed9cc3e7c1d04145c9a28e306fbc982be7a';
  const tokenTest3 = '0x01f64f5dd704f7179c6a0733f625577677b48e3e';

  const pool1 = '0x01f64f5dd704f7179c6a0733f625577677b48e4e';

  const params: UniswapV3MultiFetcherParams[] = [
    {
      fromChain: 'ethereum',
      quote: tokenTest0,
      base: tokenTest1,
      amountInDecimals: 18,
    },
    {fromChain: 'ethereum', quote: tokenTest1, base: tokenTest2, amountInDecimals: 18},
    {fromChain: 'ethereum', quote: tokenTest1, base: tokenTest3, amountInDecimals: 18},
  ];

  const responseGetPrices: [{success: boolean; price: BigNumber}[], number] = [
    [
      {success: true, price: BigNumber.from(100n * 10n ** 18n)},
      {success: true, price: BigNumber.from(200n * 10n ** 18n)},
      {success: false, price: BigNumber.from(0)},
    ],
    1710809300476,
  ];

  before(() => {
    loadTestEnv();
  });

  beforeEach(async () => {
    container = getTestContainer();
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#apply', () => {
    const responseFindUpdatedLiquidity0: UniswapV3Pool = {
      address: pool1,
      chainId: ChainsIds.ETH,
      protocol: DexProtocolName.UNISWAP_V3,
      token0: tokenTest0,
      token1: tokenTest1,
      fee: 123,
      liquidityActive: '10',
      liquidityLockedToken0: 20,
      liquidityLockedToken1: 30,
      liquidityUpdatedAt: new Date(Date.now() - 3600),
    };

    const responseFindUpdatedLiquidity1: UniswapV3Pool = {
      address: pool1,
      chainId: ChainsIds.ETH,
      protocol: DexProtocolName.UNISWAP_V3,
      token0: tokenTest1,
      token1: tokenTest2,
      fee: 123,
      liquidityActive: '10',
      liquidityLockedToken0: 20,
      liquidityLockedToken1: 30,
      liquidityUpdatedAt: new Date(Date.now() - 3600),
    };

    const responseFindUpdatedLiquidity2: UniswapV3Pool = {
      address: pool1,
      chainId: ChainsIds.ETH,
      protocol: DexProtocolName.UNISWAP_V3,
      token0: tokenTest1,
      token1: tokenTest3,
      fee: 123,
      liquidityActive: '10',
      liquidityLockedToken0: 20,
      liquidityLockedToken1: 30,
      liquidityUpdatedAt: new Date(Date.now() - 3600),
    };

    describe('when get value from DB and from contract returns data', () => {
      beforeEach(() => {
        mockedContract = {callStatic: {getPrices: async () => responseGetPrices}};
        mockedContractAddressService = sinon.createStubInstance(ContractAddressService);
        mockedContractAddressService.getContract.resolves(mockedContract);
        mockedUniswapV3PoolRepository = sinon.createStubInstance(UniswapV3PoolRepository);
        mockedUniswapV3PoolRepository.findBestPool.onCall(0).resolves(responseFindUpdatedLiquidity0);
        mockedUniswapV3PoolRepository.findBestPool.onCall(1).resolves(responseFindUpdatedLiquidity1);
        mockedUniswapV3PoolRepository.findBestPool.onCall(2).resolves(responseFindUpdatedLiquidity2);

        container.bind(ContractAddressService).toConstantValue(mockedContractAddressService);
        container.bind(UniswapV3PoolRepository).toConstantValue(mockedUniswapV3PoolRepository);
        container.bind(UniswapV3MultiFetcher).toSelf();
        container.bind(BlockchainRepository).toSelf();

        uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
      });

      it('responds with values from uniswapV3Helper', async () => {
        const result = await uniswapV3MultiFetcher.apply(params, {symbols: []});
        expect(result.prices).to.eql([100, 200, undefined]);
      });
    });

    describe('when get value from DB returns data and getPrices is rejected', () => {
      beforeEach(() => {
        mockedContract = {callStatic: {getPrices: sinon.stub().rejects()}};
        mockedContractAddressService = sinon.createStubInstance(ContractAddressService);
        mockedContractAddressService.getContract.resolves(mockedContract);
        mockedUniswapV3PoolRepository = sinon.createStubInstance(UniswapV3PoolRepository);

        container.bind(ContractAddressService).toConstantValue(mockedContractAddressService);
        container.bind(UniswapV3PoolRepository).toConstantValue(mockedUniswapV3PoolRepository);
        container.bind(UniswapV3MultiFetcher).toSelf();
        container.bind(BlockchainRepository).toSelf();

        uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
      });

      it('responds without values', async () => {
        const result = await uniswapV3MultiFetcher.apply(params, {symbols: []});
        expect(result.prices).to.be.an('array').with.lengthOf(0);
      });
    });

    describe('when get value from DB return nothing', () => {
      beforeEach(() => {
        mockedContract = {callStatic: {getPrices: async () => responseGetPrices}};
        mockedContractAddressService = sinon.createStubInstance(ContractAddressService);
        mockedContractAddressService.getContract.resolves(mockedContract);
        mockedUniswapV3PoolRepository = sinon.createStubInstance(UniswapV3PoolRepository);
        mockedUniswapV3PoolRepository.findBestPool.resolves(undefined);

        container.bind(ContractAddressService).toConstantValue(mockedContractAddressService);
        container.bind(UniswapV3PoolRepository).toConstantValue(mockedUniswapV3PoolRepository);
        container.bind(UniswapV3MultiFetcher).toSelf();
        container.bind(BlockchainRepository).toSelf();

        uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
      });

      it('responds without values', async () => {
        const result = await uniswapV3MultiFetcher.apply(params, {symbols: []});
        expect(result.prices).to.be.an('array').with.lengthOf(0);
      });
    });
  });
});
