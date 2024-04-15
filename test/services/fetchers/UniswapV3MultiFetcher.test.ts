import chai from 'chai';

import UniswapV3MultiFetcher, {
  UniswapV3MultiFetcherParams,
} from '../../../src/services/fetchers/UniswapV3MultiFetcher.js';
import Settings from '../../../src/types/Settings.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';
import {BigNumber} from 'ethers';
import {ContractHelperRepository} from '../../../src/repositories/ContractHelperRepository.js';
import sinon from 'sinon';
import {ContractHelper} from '../../../src/services/fetcherHelper/contracts/ContractHelper.js';
import {DexRepository} from '../../../src/repositories/DexRepository.js';
import {ChainsIds} from '../../../src/types/ChainsIds.js';
import {DexProtocolName} from '../../../src/types/DexProtocolName.js';

const {expect} = chai;

describe('UniswapV3MultiFetcher', () => {
  let settings: Settings;
  let uniswapV3MultiFetcher: UniswapV3MultiFetcher;
  let mockedContractHelperRepository: sinon.SinonStubbedInstance<ContractHelperRepository>;
  let mockedContractHelper: sinon.SinonStubbedInstance<ContractHelper>;
  let mockedDexRepository: sinon.SinonStubbedInstance<DexRepository>;
  let mockedContract: sinon.SinonStubbedInstance<any>;

  const tokenTest0 = '0x01ac9633f13aa16e0f8d4514c806a55f9e9abd01';
  const tokenTest1 = '0xfff9976782d46cc05630d1f6ebab18b2324d6b14';
  const tokenTest2 = '0x01d69ed9cc3e7c1d04145c9a28e306fbc982be7a';
  const tokenTest3 = '0x01f64f5dd704f7179c6a0733f625577677b48e3e';

  const pool1 = '0x01f64f5dd704f7179c6a0733f625577677b48e4e';
  const pool2 = '0x01f64f5dd704f7179c6a0733f625577677b48e6e';

  const params: UniswapV3MultiFetcherParams[] = [
    {
      token0: tokenTest0,
      token1: tokenTest1,
    },
    {token0: tokenTest1, token1: tokenTest2},
    {token0: tokenTest1, token1: tokenTest3},
  ];

  const responseGetPrices = [
    [
      {success: true, price: BigNumber.from(100)},
      {success: true, price: BigNumber.from(200)},
      {success: false, price: BigNumber.from(0)},
    ],
    1710809300476,
  ];

  beforeEach(async () => {
    const container = getTestContainer();
    container.rebind('Settings').toConstantValue(settings);
    mockedContractHelperRepository = sinon.createStubInstance(ContractHelperRepository);
    mockedContractHelper = sinon.createStubInstance(ContractHelper);
    mockedDexRepository = sinon.createStubInstance(DexRepository);
    mockedDexRepository.find.resolves([
      {
        pool: pool1,
        chainId: ChainsIds.ETH,
        dexProtocol: DexProtocolName.UNISWAP_V3,
        token0: tokenTest0,
        token1: tokenTest1,
        fee: 123,
      },
      {
        pool: pool2,
        chainId: ChainsIds.ETH,
        dexProtocol: DexProtocolName.UNISWAP_V3,
        token0: tokenTest0,
        token1: tokenTest1,
        fee: 123,
      },
    ]);

    mockedContract = {callStatic: {getPrices: async () => responseGetPrices}};
    mockedContractHelper.getContract.returns(mockedContract);
    mockedContractHelperRepository.get.returns(mockedContractHelper);

    container.bind(ContractHelperRepository).toConstantValue(mockedContractHelperRepository);
    container.bind(DexRepository).toConstantValue(mockedDexRepository);
    container.bind(UniswapV3MultiFetcher).toSelf();

    uniswapV3MultiFetcher = container.get(UniswapV3MultiFetcher);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('response with values from uniswapV3Helper', async () => {
    const result = await uniswapV3MultiFetcher.apply(params);

    expect(result).to.be.an('array').with.lengthOf(3);
    expect(result).to.be.deep.eq([100, 200, 0]);
  });
});
