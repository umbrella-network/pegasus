import chai from 'chai';
import {BigNumber} from 'ethers';
import sinon from 'sinon';

import UniswapV3MultiFetcher, {
  UniswapV3MultiFetcherParams,
} from '../../../../src/services/dexes/uniswapV3/UniswapV3MultiFetcher.js';
import settings from '../../../../src/config/settings.js';
import {getTestContainer} from '../../../helpers/getTestContainer.js';
import {UniswapV3PoolRepository} from '../../../../src/repositories/UniswapV3PoolRepository.js';
import {ChainsIds} from '../../../../src/types/ChainsIds.js';
import {DexProtocolName} from '../../../../src/types/Dexes.js';
import {Container} from 'inversify';
import {UniswapV3Pool} from '../../../../src/models/UniswapV3Pool.js';
import {BlockchainRepository} from '../../../../src/repositories/BlockchainRepository.js';
import {ContractAddressService} from '../../../../src/services/ContractAddressService.js';
import Blockchain from '../../../../src/lib/Blockchain.js';
import {loadTestEnv} from '../../../helpers/loadTestEnv.js';

const {expect} = chai;

describe.only('UniswapV3MultiFetcher', () => {
  let uniswapV3MultiFetcher: UniswapV3MultiFetcher;
  let container: Container;
  let mockedUniswapV3PoolRepository: sinon.SinonStubbedInstance<UniswapV3PoolRepository>;
  let mockedContractAddressService: sinon.SinonStubbedInstance<ContractAddressService>;
  let mockedBlockchain: sinon.SinonStubbedInstance<Blockchain>;
  let mockedContract: sinon.SinonStubbedInstance<any>;

  const tokenTest0 = '0x01ac9633f13aa16e0f8d4514c806a55f9e9abd01';
  const tokenTest1 = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14';
  const tokenTest2 = '0x01d69ed9cc3e7c1d04145c9a28e306fbc982be7a';
  const tokenTest3 = '0x01f64f5dd704f7179c6a0733f625577677b48e3e';

  const pool1 = '0x01f64f5dd704f7179c6a0733f625577677b48e4e';
  const pool2 = '0x01f64f5dd704f7179c6a0733f625577677b48e6e';

  const params: UniswapV3MultiFetcherParams[] = [
    {
      fromChain: ['ethereum'],
      quote: tokenTest0,
      base: tokenTest1,
      amountInDecimals: 10,
    },
    {fromChain: ['ethereum'], quote: tokenTest1, base: tokenTest2, amountInDecimals: 10},
    {fromChain: ['ethereum'], quote: tokenTest1, base: tokenTest3, amountInDecimals: 10},
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
      token0: tokenTest2,
      token1: tokenTest3,
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
        mockedUniswapV3PoolRepository.findUpdatedLiquidity.onCall(0).resolves(responseFindUpdatedLiquidity0);
        mockedUniswapV3PoolRepository.findUpdatedLiquidity.onCall(1).resolves(responseFindUpdatedLiquidity1);
        mockedUniswapV3PoolRepository.findUpdatedLiquidity.onCall(2).resolves(responseFindUpdatedLiquidity2);

        container.bind(ContractAddressService).toConstantValue(mockedContractAddressService);
        container.bind(UniswapV3PoolRepository).toConstantValue(mockedUniswapV3PoolRepository);
        container.bind(UniswapV3MultiFetcher).toSelf();
        container.bind(BlockchainRepository).toSelf();

        uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
      });

      it('responds with values from uniswapV3Helper', async () => {
        const result = await uniswapV3MultiFetcher.apply(params);

        expect(result).to.be.an('array').with.lengthOf(3);
        expect(result).to.eql([
          {
            base: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
            quote: '0x01ac9633f13aa16e0f8d4514c806a55f9e9abd01',
            value: 100,
          },
          {
            base: '0x01d69ed9cc3e7c1d04145c9a28e306fbc982be7a',
            quote: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
            value: 200,
          },
          {
            base: '0x01f64f5dd704f7179c6a0733f625577677b48e3e',
            quote: '0xfff9976782d46cc05630d1f6ebab18b2324d6b14',
            value: 0,
          },
        ]);
      });
    });

    //   describe('when get value from DB returns data and getPrices is rejected', () => {
    //     beforeEach(() => {
    //       mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
    //       mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
    //       mockedUniswapV3PoolRepository = sinon.createStubInstance(PoolRepository);
    //       mockedUniswapV3PoolRepository.find.resolves(responseFindQuery);
    //       mockedContract = {callStatic: {getPrices: sinon.stub().rejects()}};
    //       mockedUniswapV3Helper.getContract.returns(mockedContract);
    //       mockedContractHelperRepository.get.returns(mockedUniswapV3Helper);

    //       container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
    //       container.bind(PoolRepository).toConstantValue(mockedUniswapV3PoolRepository);
    //       container.bind(UniswapV3MultiFetcher).toSelf();

    //       uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
    //     });

    //     it('throw an error', async () => {
    //       await expect(uniswapV3MultiFetcher.apply(params)).to.throw;
    //     });
    //   });

    //   describe('when get value from DB return nothing', () => {
    //     beforeEach(() => {
    //       mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
    //       mockedUniswapV3PoolRepository = sinon.createStubInstance(PoolRepository);
    //       mockedUniswapV3PoolRepository.find.resolves([]);

    //       mockedContract = {callStatic: {getPrices: async () => responseGetPrices}};
    //       mockedUniswapV3Helper.getContract.returns(mockedContract);
    //       mockedContractHelperRepository.get.returns(mockedUniswapV3Helper);

    //       container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
    //       container.bind(PoolRepository).toConstantValue(mockedUniswapV3PoolRepository);
    //       container.bind(UniswapV3MultiFetcher).toSelf();

    //       uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
    //     });

    //     it('responds without values', async () => {
    //       const result = await uniswapV3MultiFetcher.apply(params);

    //       expect(result).to.be.an('array').with.lengthOf(0);
    //       expect(result).to.eql([]);
    //     });
    //   });
    // });

    // describe('#getPoolsToFetch', () => {
    //   describe('when get value from DB', () => {
    //     beforeEach(() => {
    //       mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
    //       mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
    //       mockedUniswapV3PoolRepository = sinon.createStubInstance(PoolRepository);
    //       mockedUniswapV3PoolRepository.find.onCall(0).resolves(responseFindQuery0);
    //       mockedUniswapV3PoolRepository.find.onCall(1).resolves(responseFindQuery1);
    //       mockedUniswapV3PoolRepository.find.onCall(2).resolves([]);

    //       container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
    //       container.bind(PoolRepository).toConstantValue(mockedUniswapV3PoolRepository);
    //       container.bind(UniswapV3MultiFetcher).toSelf();

    //       uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
    //     });

    //     it('responds with aggregated pools and only with data found', async () => {
    //       const result = await uniswapV3MultiFetcher.getPoolsToFetch(params);

    //       expect(result).to.be.an('array').with.lengthOf(2);
    //       expect(result).to.eql([
    //         {
    //           pools: [responseFindQuery0[0].pool, responseFindQuery0[1].pool],
    //           base: responseFindQuery0[0].token0,
    //           quote: responseFindQuery0[0].token1,
    //         },
    //         {
    //           pools: [responseFindQuery1[0].pool],
    //           base: responseFindQuery1[0].token0,
    //           quote: responseFindQuery1[0].token1,
    //         },
    //       ]);
    //     });
    //   });
    // });

    // describe('#fetchData', () => {
    //   describe('when get value from DB', () => {
    //     beforeEach(() => {
    //       mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
    //       mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
    //       mockedUniswapV3PoolRepository = sinon.createStubInstance(PoolRepository);
    //       mockedContract = {callStatic: {getPrices: async () => responseGetPrices}};
    //       mockedUniswapV3Helper.getContract.returns(mockedContract);
    //       mockedContractHelperRepository.get.returns(mockedUniswapV3Helper);

    //       container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
    //       container.bind(PoolRepository).toConstantValue(mockedUniswapV3PoolRepository);
    //       container.bind(UniswapV3MultiFetcher).toSelf();

    //       uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
    //     });

    //     it('responds with processed pools', async () => {
    //       const poolsToFetch = [
    //         {
    //           pools: [responseFindQuery0[0].pool, responseFindQuery0[1].pool],
    //           base: responseFindQuery0[0].token0,
    //           quote: responseFindQuery0[0].token1,
    //         },
    //         {
    //           pools: [responseFindQuery1[0].pool],
    //           base: responseFindQuery1[0].token0,
    //           quote: responseFindQuery1[0].token1,
    //         },
    //         {
    //           pools: [responseFindQuery1[0].pool],
    //           base: responseFindQuery1[0].token0,
    //           quote: responseFindQuery1[0].token1,
    //         },
    //       ];
    //       const result = await uniswapV3MultiFetcher.fetchData(poolsToFetch);

    //       expect(result).to.be.an('array').with.lengthOf(3);
    //       expect(result).to.eql([
    //         {
    //           token0: poolsToFetch[0].base,
    //           token1: poolsToFetch[0].quote,
    //           value: responseGetPrices[0][0].price.toNumber(),
    //         },
    //         {
    //           token0: poolsToFetch[1].base,
    //           token1: poolsToFetch[1].quote,
    //           value: responseGetPrices[0][1].price.toNumber(),
    //         },
    //         {
    //           token0: poolsToFetch[2].base,
    //           token1: poolsToFetch[2].quote,
    //           value: 0,
    //         },
    //       ]);
    //     });
    //   });
    // });
    // describe('#fetchData', () => {
    //   describe('when get value from DB', () => {
    //     beforeEach(() => {
    //       mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
    //       mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
    //       mockedUniswapV3PoolRepository = sinon.createStubInstance(PoolRepository);
    //       mockedContract = {callStatic: {getPrices: async () => responseGetPrices}};
    //       mockedUniswapV3Helper.getContract.returns(mockedContract);
    //       mockedContractHelperRepository.get.returns(mockedUniswapV3Helper);

    //       container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
    //       container.bind(PoolRepository).toConstantValue(mockedUniswapV3PoolRepository);
    //       container.bind(UniswapV3MultiFetcher).toSelf();

    //       uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
    //     });

    //     it('responds with processed pools', async () => {
    //       const poolsToFetch = [
    //         {
    //           pools: [responseFindQuery0[0].pool, responseFindQuery0[1].pool],
    //           base: responseFindQuery0[0].token0,
    //           quote: responseFindQuery0[0].token1,
    //         },
    //         {
    //           pools: [responseFindQuery1[0].pool],
    //           base: responseFindQuery1[0].token0,
    //           quote: responseFindQuery1[0].token1,
    //         },
    //         {
    //           pools: [responseFindQuery1[0].pool],
    //           base: responseFindQuery1[0].token0,
    //           quote: responseFindQuery1[0].token1,
    //         },
    //       ];
    //       const result = await uniswapV3MultiFetcher.fetchData(poolsToFetch);

    //       expect(result).to.be.an('array').with.lengthOf(3);
    //       expect(result).to.eql([
    //         {
    //           token0: poolsToFetch[0].base,
    //           token1: poolsToFetch[0].quote,
    //           value: responseGetPrices[0][0].price.toNumber(),
    //         },
    //         {
    //           token0: poolsToFetch[1].base,
    //           token1: poolsToFetch[1].quote,
    //           value: responseGetPrices[0][1].price.toNumber(),
    //         },
    //         {
    //           token0: poolsToFetch[2].base,
    //           token1: poolsToFetch[2].quote,
    //           value: 0,
    //         },
    //       ]);
    //     });
    //   });
    // });

    // describe('#processResult', () => {
    //   beforeEach(() => {
    //     mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
    //     mockedUniswapV3Helper = sinon.createStubInstance(UniswapV3Helper);
    //     mockedUniswapV3PoolRepository = sinon.createStubInstance(PoolRepository);
    //     mockedContract = {callStatic: {getPrices: async () => responseGetPrices}};
    //     mockedUniswapV3Helper.getContract.returns(mockedContract);
    //     mockedContractHelperRepository.get.returns(mockedUniswapV3Helper);

    //     container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
    //     container.bind(PoolRepository).toConstantValue(mockedUniswapV3PoolRepository);
    //     container.bind(UniswapV3MultiFetcher).toSelf();

    //     uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
    //   });

    //   it('responds with processed success pools', async () => {
    //     const poolsToFetch = [
    //       {
    //         pools: [responseFindQuery0[0].pool, responseFindQuery0[1].pool],
    //         base: responseFindQuery0[0].token0,
    //         quote: responseFindQuery0[0].token1,
    //       },
    //       {
    //         pools: [responseFindQuery1[0].pool],
    //         base: responseFindQuery1[0].token0,
    //         quote: responseFindQuery1[0].token1,
    //       },
    //       {
    //         pools: [responseFindQuery1[0].pool],
    //         base: responseFindQuery1[0].token0,
    //         quote: responseFindQuery1[0].token1,
    //       },
    //     ];

    //     const results = [
    //       {success: true, price: BigNumber.from(123)},
    //       {success: true, price: BigNumber.from(333)},
    //       {success: false, price: BigNumber.from(13)},
    //     ];
    //     const result = await uniswapV3MultiFetcher.processResult(results, poolsToFetch);

    //     expect(result).to.be.an('array').with.lengthOf(3);
    //     expect(result).to.eql([
    //       {
    //         token0: poolsToFetch[0].base,
    //         token1: poolsToFetch[0].quote,
    //         value: results[0].price.toNumber(),
    //       },
    //       {
    //         token0: poolsToFetch[1].base,
    //         token1: poolsToFetch[1].quote,
    //         value: results[1].price.toNumber(),
    //       },
    //       {
    //         token0: poolsToFetch[2].base,
    //         token1: poolsToFetch[2].quote,
    //         value: 0,
    //       },
    //     ]);
    //   });
  });
});
