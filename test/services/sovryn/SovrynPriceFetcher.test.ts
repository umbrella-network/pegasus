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
    const testnetNodeUrl = 'https://public-node.testnet.rsk.co/';

    const container = getTestContainer({
      blockchain: {
        multiChains: {
          rootstock: {
            providerUrl: testnetNodeUrl,
            contractRegistryAddress: '0x8f98d3B5C911206C1Ac08B9938875620A03BCd59',
          },
        },
        wallets: {
          evm: {
            privateKey: '0x0000000000000000000000000000000000000000000000000000000000000001',
          },
        },
      },
    } as Settings);

    container.bind('SovrynPriceFetcher').to(SovrynPriceFetcher);

    const rUSDT = '0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0';
    const weBTC = '0x69fe5cec81d5ef92600c1a0db1f11986ab3758ab';
    const amountInDecimals = 8;
    const requestPair1: PairRequest = {
      base: weBTC,
      quote: rUSDT,
      amountInDecimals,
    };

    const sovrynPriceFetcher = container.get('SovrynPriceFetcher') as SovrynPriceFetcher;
    const output = await sovrynPriceFetcher.apply([requestPair1, requestPair1]);

    console.log('price weBTC/rUSDT:', output.prices[0]);
    console.log('price weBTC/rUSDT:', output.prices[1]);
  });
});
