import {expect} from 'chai';

import {PairRequest, SovrynPriceFetcher} from '../../../src/services/dexes/sovryn/SovrynPriceFetcher.js';

import {getTestContainer} from '../../helpers/getTestContainer.js';
import Settings from '../../../src/types/Settings.js';
import {bigIntToFloatingPoint} from '../../../src/utils/math.js';

describe('SovrynFetcher', () => {
  it('gets successfully an instance of the SovrynFetcher from the container', () => {
    const container = getTestContainer();
    container.bind('SovrynPriceFetcher').to(SovrynPriceFetcher);
    const sovrynPriceFetcher = container.get('SovrynPriceFetcher') as SovrynPriceFetcher;

    expect(sovrynPriceFetcher !== undefined);
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
    {
      const integerValue = BigInt('123');
      const result = bigIntToFloatingPoint(integerValue, 0);
      expect(result).to.equal(123);
    }
    {
      const integerValue = BigInt('123');
      const result = bigIntToFloatingPoint(integerValue, 1);
      expect(result).to.equal(12.3);
    }
    {
      const integerValue = BigInt('123456789000000000');
      const result = bigIntToFloatingPoint(integerValue, 18);
      expect(result).to.equal(0.123456789);
    }
    {
      const integerValue = BigInt('123456789000000001');
      const result = bigIntToFloatingPoint(integerValue, 18);
      expect(result).to.equal(0.123456789);
    }
    {
      const integerValue = BigInt('99123456789000000000');
      const result = bigIntToFloatingPoint(integerValue, 18);
      expect(result).to.equal(99.123456789);
    }
    {
      const integerValue = BigInt('123456789000000000');
      const result = bigIntToFloatingPoint(integerValue, 9);
      expect(result).to.equal(123456789.0);
    }
  });
});

describe.skip('SovrynFetcher-IntegrationTests', () => {
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
