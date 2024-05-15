import {expect} from 'chai';

import {SovrynPriceFetcher} from '../../../src/services/dexes/sovryn/SovrynPriceFetcher.js';

import {PricesResponse, PairRequest, SovrynHelperBase} from '../../../src/blockchains/evm/contracts/SovrynHelper.js';

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
    const expectedPrices = {values: ['12982.92', '19281.341239', '238982.23'], timestamp: '3283723933'};
    const sovrynConnection = new SovrynHelperMock(expectedPrices);
    const sovrynFetcher = new SovrynPriceFetcher(sovrynConnection);

    const pairs: PairRequest[] = [
      {
        inputTokenAddress: '0x11111111111111111111',
        outputTokenAddress: '0x22222222222222222222',
        amount: '1',
      },
      {
        inputTokenAddress: '0x33333333333333333333',
        outputTokenAddress: '0x44444444444444444444',
        amount: '1',
      },
      {
        inputTokenAddress: '0x55555555555555555555',
        outputTokenAddress: '0x66666666666666666666',
        amount: '1',
      },
    ];

    const prices = await sovrynFetcher.getPrices(pairs);

    expect(prices).to.eql(expectedPrices);
  });
});
