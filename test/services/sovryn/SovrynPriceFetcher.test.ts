import {expect} from 'chai';
import {BigNumber} from 'ethers';

import {
  PairRequest,
  PricesResponse,
  bigIntToFloatingPoint,
  SovrynPriceFetcher,
} from '../../../src/services/dexes/sovryn/SovrynPriceFetcher.js';

import {getTestContainer} from '../../helpers/getTestContainer.js';
import Settings from '../../../src/types/Settings.js';

describe('SovrynFetcher', () => {
  it('gets successfully an instance of the SovrynFetcher from the container', () => {
    const container = getTestContainer();
    container.bind('SovrynPriceFetcher').to(SovrynPriceFetcher);
    const sovrynPriceFetcher = container.get('SovrynPriceFetcher') as SovrynPriceFetcher;

    expect(sovrynPriceFetcher !== undefined);
  });

  it('fetches the prices for the pairs passed', async () => {
    // const contractPriceResponse: PricesResponse = {
    //   prices: [{price: BigNumber.from('129829220112102'), success: true}],
    //   timestamp: BigNumber.from('3283723933'),
    // };
    // const container = getTestContainer();
    // container.bind('SovrynPriceFetcher').to(SovrynPriceFetcher);
    // const pair: PairRequest = {
    //   base: '0x11111111111111111111',
    //   quote: '0x22222222222222222222',
    //   amountInDecimals: 1,
    // };
    // const sovrynPriceFetcher = container.get('SovrynPriceFetcher') as SovrynPriceFetcher;
    //const price = await sovrynPriceFetcher.apply(pair);
    //expect(price).to.eql(1298292.20112102);
  });
});

describe('SovrynFetcher-BigIntToFloatingPoint', () => {
  it('converts BigInt values into floating-point ones', () => {
    {
      const integerValue = BigInt('1234567891234');
      const result = bigIntToFloatingPoint(integerValue, 0);
      expect(result).to.equal(1234567891234);
    }
    {
      const integerValue = BigInt('1234567891234');
      const result = bigIntToFloatingPoint(integerValue, 1);
      expect(result).to.equal(123456789123.4);
    }
    {
      const integerValue = BigInt('1234567891234');
      const result = bigIntToFloatingPoint(integerValue, 5);
      expect(result).to.equal(12345678.91234);
    }
    {
      const integerValue = BigInt('1234567891234');
      const result = bigIntToFloatingPoint(integerValue, 12);
      expect(result).to.equal(1.234567891234);
    }
    {
      const integerValue = BigInt('12345');
      const result = bigIntToFloatingPoint(integerValue, 5);
      expect(result).to.equal(0.12345);
    }
    {
      const integerValue = BigInt('12345');
      const result = bigIntToFloatingPoint(integerValue, 10);
      expect(result).to.equal(0.0000012345);
    }
  });
});

describe('SovrynFetcher-IntegrationTests', () => {
  it('fetches the prices from the SovrynPriceFetcher for the pair rBTC/rUSTC', async () => {
    const sovrynHelperAddress = '0x26fd86791fce0946e8d8c685446dd257634a2b28';
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

    const rUSDT = '0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0';
    const weBTC = '0x69fe5cec81d5ef92600c1a0db1f11986ab3758ab';
    const amountInDecimals = 8;
    const requestPair: PairRequest = {
      base: weBTC,
      quote: rUSDT,
      amountInDecimals,
    };

    const sovrynPriceFetcher = container.get('SovrynPriceFetcher') as SovrynPriceFetcher;
    const price: number = await sovrynPriceFetcher.apply(requestPair);

    console.log('price weBTC/rUSDT:', price);
  });
});
