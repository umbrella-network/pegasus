import chai from 'chai';
import {BigNumber} from 'ethers';
import sinon from 'sinon';

import UniswapV3MultiFetcher, {
  UniswapV3MultiFetcherParams,
} from '../../../src/services/fetchers/UniswapV3MultiFetcher.js';
import Settings from '../../../src/types/Settings.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';
import {ContractHelperRepository} from '../../../src/repositories/ContractHelperRepository.js';
import {UniswapV3Helper} from '../../../src/services/fetcherHelper/contracts/UniswapV3Helper.js';
import {PoolRepository} from '../../../src/repositories/PoolRepository.js';
import {ChainsIds} from '../../../src/types/ChainsIds.js';
import {DexProtocolName} from '../../../src/types/DexProtocolName.js';
import {Container} from 'inversify';

const {expect} = chai;

describe('UniswapV3MultiFetcher', () => {
  let settings: Settings;
  let uniswapV3MultiFetcher: UniswapV3MultiFetcher;
  let container: Container;
  let mockedContractHelperRepository: sinon.SinonStubbedInstance<ContractHelperRepository>;
  let mockedUniswapV3Helper: sinon.SinonStubbedInstance<UniswapV3Helper>;
  let mockedPoolRepository: sinon.SinonStubbedInstance<PoolRepository>;
  let mockedContract: sinon.SinonStubbedInstance<any>;

  const tokenTest0 = '0x01ac9633f13aa16e0f8d4514c806a55f9e9abd01';
  const tokenTest1 = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14';
  const tokenTest2 = '0x01d69ed9cc3e7c1d04145c9a28e306fbc982be7a';
  const tokenTest3 = '0x01f64f5dd704f7179c6a0733f625577677b48e3e';

  const pool1 = '0x01f64f5dd704f7179c6a0733f625577677b48e4e';
  const pool2 = '0x01f64f5dd704f7179c6a0733f625577677b48e6e';

  const params: UniswapV3MultiFetcherParams[] = [
    {
      chainFrom: ['ethereum'],
      token0: tokenTest0,
      token1: tokenTest1,
    },
    {chainFrom: ['ethereum', 'bsc'], token0: tokenTest1, token1: tokenTest2},
    {chainFrom: ['ethereum'], token0: tokenTest1, token1: tokenTest3},
  ];

  const responseGetPrices: [{success: boolean; price: BigNumber}[], number] = [
    [
      {success: true, price: BigNumber.from(100)},
      {success: true, price: BigNumber.from(200)},
      {success: false, price: BigNumber.from(0)},
    ],
    1710809300476,
  ];

  const responseFindQuery0 = [
    {
      pool: pool1,
      chainId: ChainsIds.ETH,
      protocol: DexProtocolName.UNISWAP_V3,
      token0: tokenTest0,
      token1: tokenTest1,
      fee: 123,
    },
    {
      pool: pool2,
      chainId: ChainsIds.ETH,
      protocol: DexProtocolName.UNISWAP_V3,
      token0: tokenTest0,
      token1: tokenTest1,
      fee: 123,
    },
  ];

  const responseFindQuery1 = [
    {
      pool: pool1,
      chainId: ChainsIds.ETH,
      protocol: DexProtocolName.UNISWAP_V3,
      token0: tokenTest1,
      token1: tokenTest2,
      fee: 300,
    },
  ];

  beforeEach(async () => {
    container = getTestContainer();
    container.rebind('Settings').toConstantValue(settings);
  });

  afterEach(() => {
    sinon.restore();
  });

  describe('#apply', () => {
    const responseFindQuery = [
      {
        pool: pool1,
        chainId: ChainsIds.ETH,
        protocol: DexProtocolName.UNISWAP_V3,
        token0: tokenTest0,
        token1: tokenTest1,
        fee: 123,
      },
      {
        pool: pool2,
        chainId: ChainsIds.ETH,
        protocol: DexProtocolName.UNISWAP_V3,
        token0: tokenTest0,
        token1: tokenTest1,
        fee: 123,
      },
    ];

    describe('when get value from DB and from contract returns data', () => {
      beforeEach(() => {
        mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
        mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
        mockedPoolRepository = sinon.createStubInstance(PoolRepository);
        mockedPoolRepository.find.resolves(responseFindQuery);
        mockedContract = {callStatic: {getPrices: async () => responseGetPrices}};
        mockedUniswapV3Helper.getContract.returns(mockedContract);
        mockedContractHelperRepository.get.returns(mockedUniswapV3Helper);

        container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
        container.bind(PoolRepository).toConstantValue(mockedPoolRepository);
        container.bind(UniswapV3MultiFetcher).toSelf();

        uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
      });

      it('responds with values from uniswapV3Helper', async () => {
        const result = await uniswapV3MultiFetcher.apply(params);

        expect(result).to.be.an('array').with.lengthOf(3);
        expect(result).to.eql([
          {
            token0: '0x01ac9633f13aa16e0f8d4514c806a55f9e9abd01',
            token1: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
            value: 100,
          },
          {
            token0: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
            token1: '0x01d69ed9cc3e7c1d04145c9a28e306fbc982be7a',
            value: 200,
          },
          {
            token0: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
            token1: '0x01f64f5dd704f7179c6a0733f625577677b48e3e',
            value: 0,
          },
        ]);
      });
    });

    describe('when get value from DB returns data and getPrices is rejected', () => {
      beforeEach(() => {
        mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
        mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
        mockedPoolRepository = sinon.createStubInstance(PoolRepository);
        mockedPoolRepository.find.resolves(responseFindQuery);
        mockedContract = {callStatic: {getPrices: sinon.stub().rejects()}};
        mockedUniswapV3Helper.getContract.returns(mockedContract);
        mockedContractHelperRepository.get.returns(mockedUniswapV3Helper);

        container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
        container.bind(PoolRepository).toConstantValue(mockedPoolRepository);
        container.bind(UniswapV3MultiFetcher).toSelf();

        uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
      });

      it('throw an error', async () => {
        await expect(uniswapV3MultiFetcher.apply(params)).to.throw;
      });
    });

    describe('when get value from DB return nothing', () => {
      beforeEach(() => {
        mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
        mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
        mockedPoolRepository = sinon.createStubInstance(PoolRepository);
        mockedPoolRepository.find.resolves([]);

        mockedContract = {callStatic: {getPrices: async () => responseGetPrices}};
        mockedUniswapV3Helper.getContract.returns(mockedContract);
        mockedContractHelperRepository.get.returns(mockedUniswapV3Helper);

        container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
        container.bind(PoolRepository).toConstantValue(mockedPoolRepository);
        container.bind(UniswapV3MultiFetcher).toSelf();

        uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
      });

      it('responds without values', async () => {
        const result = await uniswapV3MultiFetcher.apply(params);

        expect(result).to.be.an('array').with.lengthOf(0);
        expect(result).to.eql([]);
      });
    });
  });

  describe('#getPoolsToFetch', () => {
    describe('when get value from DB', () => {
      beforeEach(() => {
        mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
        mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
        mockedPoolRepository = sinon.createStubInstance(PoolRepository);
        mockedPoolRepository.find.onCall(0).resolves(responseFindQuery0);
        mockedPoolRepository.find.onCall(1).resolves(responseFindQuery1);
        mockedPoolRepository.find.onCall(2).resolves([]);

        container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
        container.bind(PoolRepository).toConstantValue(mockedPoolRepository);
        container.bind(UniswapV3MultiFetcher).toSelf();

        uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
      });

      it('responds with aggregated pools and only with data found', async () => {
        const result = await uniswapV3MultiFetcher.getPoolsToFetch(params);

        expect(result).to.be.an('array').with.lengthOf(2);
        expect(result).to.eql([
          {
            pools: [responseFindQuery0[0].pool, responseFindQuery0[1].pool],
            base: responseFindQuery0[0].token0,
            quote: responseFindQuery0[0].token1,
          },
          {
            pools: [responseFindQuery1[0].pool],
            base: responseFindQuery1[0].token0,
            quote: responseFindQuery1[0].token1,
          },
        ]);
      });
    });
  });

  describe('#fetchData', () => {
    describe('when get value from DB', () => {
      beforeEach(() => {
        mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
        mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
        mockedPoolRepository = sinon.createStubInstance(PoolRepository);
        mockedContract = {callStatic: {getPrices: async () => responseGetPrices}};
        mockedUniswapV3Helper.getContract.returns(mockedContract);
        mockedContractHelperRepository.get.returns(mockedUniswapV3Helper);

        container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
        container.bind(PoolRepository).toConstantValue(mockedPoolRepository);
        container.bind(UniswapV3MultiFetcher).toSelf();

        uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
      });

      it('responds with processed pools', async () => {
        const poolsToFetch = [
          {
            pools: [responseFindQuery0[0].pool, responseFindQuery0[1].pool],
            base: responseFindQuery0[0].token0,
            quote: responseFindQuery0[0].token1,
          },
          {
            pools: [responseFindQuery1[0].pool],
            base: responseFindQuery1[0].token0,
            quote: responseFindQuery1[0].token1,
          },
          {
            pools: [responseFindQuery1[0].pool],
            base: responseFindQuery1[0].token0,
            quote: responseFindQuery1[0].token1,
          },
        ];
        const result = await uniswapV3MultiFetcher.fetchData(poolsToFetch);

        expect(result).to.be.an('array').with.lengthOf(3);
        expect(result).to.eql([
          {
            token0: poolsToFetch[0].base,
            token1: poolsToFetch[0].quote,
            value: responseGetPrices[0][0].price.toNumber(),
          },
          {
            token0: poolsToFetch[1].base,
            token1: poolsToFetch[1].quote,
            value: responseGetPrices[0][1].price.toNumber(),
          },
          {
            token0: poolsToFetch[2].base,
            token1: poolsToFetch[2].quote,
            value: 0,
          },
        ]);
      });
    });
  });
  describe('#fetchData', () => {
    describe('when get value from DB', () => {
      beforeEach(() => {
        mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
        mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
        mockedPoolRepository = sinon.createStubInstance(PoolRepository);
        mockedContract = {callStatic: {getPrices: async () => responseGetPrices}};
        mockedUniswapV3Helper.getContract.returns(mockedContract);
        mockedContractHelperRepository.get.returns(mockedUniswapV3Helper);

        container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
        container.bind(PoolRepository).toConstantValue(mockedPoolRepository);
        container.bind(UniswapV3MultiFetcher).toSelf();

        uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
      });

      it('responds with processed pools', async () => {
        const poolsToFetch = [
          {
            pools: [responseFindQuery0[0].pool, responseFindQuery0[1].pool],
            base: responseFindQuery0[0].token0,
            quote: responseFindQuery0[0].token1,
          },
          {
            pools: [responseFindQuery1[0].pool],
            base: responseFindQuery1[0].token0,
            quote: responseFindQuery1[0].token1,
          },
          {
            pools: [responseFindQuery1[0].pool],
            base: responseFindQuery1[0].token0,
            quote: responseFindQuery1[0].token1,
          },
        ];
        const result = await uniswapV3MultiFetcher.fetchData(poolsToFetch);

        expect(result).to.be.an('array').with.lengthOf(3);
        expect(result).to.eql([
          {
            token0: poolsToFetch[0].base,
            token1: poolsToFetch[0].quote,
            value: responseGetPrices[0][0].price.toNumber(),
          },
          {
            token0: poolsToFetch[1].base,
            token1: poolsToFetch[1].quote,
            value: responseGetPrices[0][1].price.toNumber(),
          },
          {
            token0: poolsToFetch[2].base,
            token1: poolsToFetch[2].quote,
            value: 0,
          },
        ]);
      });
    });
  });

  describe('#processResult', () => {
    beforeEach(() => {
      mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
      mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
      mockedPoolRepository = sinon.createStubInstance(PoolRepository);
      mockedContract = {callStatic: {getPrices: async () => responseGetPrices}};
      mockedUniswapV3Helper.getContract.returns(mockedContract);
      mockedContractHelperRepository.get.returns(mockedUniswapV3Helper);

      container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
      container.bind(PoolRepository).toConstantValue(mockedPoolRepository);
      container.bind(UniswapV3MultiFetcher).toSelf();

      uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
    });

    it('responds with processed success pools', async () => {
      const poolsToFetch = [
        {
          pools: [responseFindQuery0[0].pool, responseFindQuery0[1].pool],
          base: responseFindQuery0[0].token0,
          quote: responseFindQuery0[0].token1,
        },
        {
          pools: [responseFindQuery1[0].pool],
          base: responseFindQuery1[0].token0,
          quote: responseFindQuery1[0].token1,
        },
        {
          pools: [responseFindQuery1[0].pool],
          base: responseFindQuery1[0].token0,
          quote: responseFindQuery1[0].token1,
        },
      ];

      const results = [
        {success: true, price: BigNumber.from(123)},
        {success: true, price: BigNumber.from(333)},
        {success: false, price: BigNumber.from(13)},
      ];
      const result = await uniswapV3MultiFetcher.processResult(results, poolsToFetch);

      expect(result).to.be.an('array').with.lengthOf(3);
      expect(result).to.eql([
        {
          token0: poolsToFetch[0].base,
          token1: poolsToFetch[0].quote,
          value: results[0].price.toNumber(),
        },
        {
          token0: poolsToFetch[1].base,
          token1: poolsToFetch[1].quote,
          value: results[1].price.toNumber(),
        },
        {
          token0: poolsToFetch[2].base,
          token1: poolsToFetch[2].quote,
          value: 0,
        },
      ]);
    });
  });
});
