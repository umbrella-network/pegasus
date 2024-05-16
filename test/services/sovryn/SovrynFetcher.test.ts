import {expect} from 'chai';

import {SovrynPriceFetcher} from '../../../src/services/dexes/sovryn/SovrynPriceFetcher.js';

import {
  PricesResponse,
  PairRequest,
  SovrynHelper,
  SovrynHelperBase,
} from '../../../src/blockchains/evm/contracts/SovrynHelper.js';

import {BigNumber} from 'ethers';

class SovrynHelperMock extends SovrynHelperBase {
  prices!: PricesResponse;

  constructor(pricesToReturn: PricesResponse) {
    super();
    this.prices = pricesToReturn;
  }

  async getPrices(): Promise<PricesResponse> {
    return Promise.resolve(this.prices);
  }
}

describe('SovrynFetcher', () => {
  it('creates successfully an instance of the SovrynFetcher', () => {
    const sovrynConnection = new SovrynHelperMock({} as PricesResponse);
    const sovrynFetcher = new SovrynPriceFetcher(sovrynConnection);

    expect(sovrynFetcher !== undefined);
  });

  it('fetches the prices for the pairs passed', async () => {
    const expectedPrices: PricesResponse = {
      prices: [
        {price: BigNumber.from('1298292'), success: true},
        {price: BigNumber.from('1928134'), success: true},
        {price: BigNumber.from('23898223'), success: true},
      ],
      timestamp: BigNumber.from('3283723933'),
    };
    const sovrynConnection = new SovrynHelperMock(expectedPrices);
    const sovrynFetcher = new SovrynPriceFetcher(sovrynConnection);

    const pairs: PairRequest[] = [
      {
        base: '0x11111111111111111111',
        quote: '0x22222222222222222222',
        amount: 1,
      },
      {
        base: '0x33333333333333333333',
        quote: '0x44444444444444444444',
        amount: 1,
      },
      {
        base: '0x55555555555555555555',
        quote: '0x66666666666666666666',
        amount: 1,
      },
    ];

    const prices = await sovrynFetcher.getPrices(pairs);

    expect(prices).to.eql(expectedPrices);
  });
});

describe.skip('SovrynFetcher-IntegrationTests', () => {
  it('fetches the prices of the pair rBTC/rUSTC', async () => {
    const sovrynHelperAddress = '0xbc758fcb97e06ec635dff698f55e41acc35e1d2d';
    const rUSDT = '0xcb46c0ddc60d18efeb0e586c17af6ea36452dae0';
    const weBTC = '0x69fe5cec81d5ef92600c1a0db1f11986ab3758ab';
    const testnetNodeUrl = 'https://public-node.testnet.rsk.co/';
    const amount = 10 ** 8;

    const requestPairs: PairRequest[] = [{base: weBTC, quote: rUSDT, amount}];
    const sovrynConnection = new SovrynHelper(sovrynHelperAddress, testnetNodeUrl);
    const sovrynFetcher = new SovrynPriceFetcher(sovrynConnection);

    const result: PricesResponse = await sovrynFetcher.getPrices(requestPairs);

    console.log('timestamp:', result.timestamp.toString());
    expect(result.prices.length).to.equals(1);
    console.log('price weBTC/rUSDT:', result.prices[0].price.toString());
    expect(result.prices[0].success).to.be.true;
  });
});
