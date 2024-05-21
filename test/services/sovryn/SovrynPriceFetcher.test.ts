import {expect} from 'chai';
import {BigNumber} from 'ethers';

import {
  PairRequest,
  PricesResponse,
  BigIntToFloatingPoint,
  SovrynPriceFetcher,
} from '../../../src/services/dexes/sovryn/SovrynPriceFetcher.js';

import {getTestContainer} from '../../helpers/getTestContainer.js';
import Settings from '../../../src/types/Settings.js';

// describe('SovrynFetcher', () => {
//   it('creates successfully an instance of the SovrynFetcher', () => {
//     const sovrynFetcherHelper = new SovrynHelperMock({} as PricesResponse);
//     const container = getTestContainer();
//     container.bind('SovrynFetcherHelper').toConstantValue(sovrynFetcherHelper);
//     container.bind('SovrynPriceFetcher').to(SovrynPriceFetcher);
//     const sovrynPriceFetcher = container.get('SovrynPriceFetcher') as SovrynPriceFetcher;

//     expect(sovrynPriceFetcher !== undefined);
//   });

//   it('fetches the prices for the pairs passed', async () => {
//     const expectedPrices: PricesResponse = {
//       prices: [
//         {price: BigNumber.from('1298292'), success: true},
//         {price: BigNumber.from('1928134'), success: true},
//         {price: BigNumber.from('23898223'), success: true},
//       ],
//       timestamp: BigNumber.from('3283723933'),
//     };
//     const sovrynConnection = new SovrynHelperMock(expectedPrices);
//     const container = getTestContainer();
//     container.bind('SovrynFetcherHelper').toConstantValue(sovrynConnection);
//     container.bind('SovrynPriceFetcher').to(SovrynPriceFetcher);
//     const sovrynPriceFetcher = container.get('SovrynPriceFetcher') as SovrynPriceFetcher;

//     const pairs: PairRequest[] = [
//       {
//         base: '0x11111111111111111111',
//         quote: '0x22222222222222222222',
//         quoteDecimals: 8,
//         amount: 1,
//       },
//       {
//         base: '0x33333333333333333333',
//         quote: '0x44444444444444444444',
//         quoteDecimals: 8,
//         amount: 1,
//       },
//       {
//         base: '0x55555555555555555555',
//         quote: '0x66666666666666666666',
//         quoteDecimals: 8,
//         amount: 1,
//       },
//     ];

//     const prices = await sovrynPriceFetcher.getPrices(pairs);

//     expect(prices).to.eql(expectedPrices);
//   });
// });

describe('SovrynFetcher-BigIntToFloatingPoint', () => {
  it('converts BigInt values into floating-point ones', () => {
    {
      const integerValue = BigInt('1234567891234');
      const result = BigIntToFloatingPoint(integerValue, 0);
      expect(result).to.equal(1234567891234);
    }
    {
      const integerValue = BigInt('1234567891234');
      const result = BigIntToFloatingPoint(integerValue, 1);
      expect(result).to.equal(123456789123.4);
    }
    {
      const integerValue = BigInt('1234567891234');
      const result = BigIntToFloatingPoint(integerValue, 5);
      expect(result).to.equal(12345678.91234);
    }
    {
      const integerValue = BigInt('1234567891234');
      const result = BigIntToFloatingPoint(integerValue, 12);
      expect(result).to.equal(1.234567891234);
    }
    {
      const integerValue = BigInt('12345');
      const result = BigIntToFloatingPoint(integerValue, 5);
      expect(result).to.equal(0.12345);
    }
    {
      const integerValue = BigInt('12345');
      const result = BigIntToFloatingPoint(integerValue, 10);
      expect(result).to.equal(0.0000012345);
    }
  });
});

describe.skip('SovrynFetcher-IntegrationTests', () => {
  it('fetches the prices from the SovrynPriceFetcher for the pair rBTC/rUSTC', async () => {
    const sovrynHelperAddress = '0xbc758fcb97e06ec635dff698f55e41acc35e1d2d';
    const testnetNodeUrl = 'https://public-node.testnet.rsk.co/';

    const container = getTestContainer({
      blockchain: {
        multiChains: {
          rootstock: {
            providerUrl: testnetNodeUrl,
          },
        },
      },
      dexes: {
        sovryn: {
          rootstock: {
            helperContractAddress: sovrynHelperAddress,
          },
        },
      },
    } as Settings);

    container.bind('SovrynPriceFetcher').to(SovrynPriceFetcher);

    const sovrynPriceFetcher = container.get('SovrynPriceFetcher') as SovrynPriceFetcher;

    const rUSDT = '0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0';
    const weBTC = '0x69fe5cec81d5ef92600c1a0db1f11986ab3758ab';
    const amount = 10 ** 8;
    const rUSDTDecimals = 8;
    const requestPair: PairRequest = {
      base: weBTC,
      quote: rUSDT,
      amount,
      quoteDecimals: rUSDTDecimals,
    };

    const price: number = await sovrynPriceFetcher.apply(requestPair);

    console.log('price weBTC/rUSDT:', price);
  });
});
