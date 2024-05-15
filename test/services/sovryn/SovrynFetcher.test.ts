import {expect} from 'chai';

import {
  SovrynPriceFetcher,
  SovrynConnectionBase,
  Prices,
  Pair,
} from '../../../src/services/dexes/sovryn/SovrynPriceFetcher.js';

const nodeUrl = 'https://sovryn.node.com';
const sovrynHelperContractAddress = '0x11111111111111111111';

class SovrynConnectionMock extends SovrynConnectionBase {
  prices!: Prices;

  constructor(blockchainNodeUrl: string, sovrynHelperContractAddress: string, pricesToReturn: Prices) {
    super(blockchainNodeUrl, sovrynHelperContractAddress);
    this.prices = pricesToReturn;
  }

  getPrices(): Prices {
    return this.prices;
  }
}

describe('SovrynFetcher', () => {
  it('creates successfully an instance of the SovrynFetcher', () => {
    const sovrynConnection = new SovrynConnectionMock(nodeUrl, sovrynHelperContractAddress, {} as Prices);
    const sovrynFetcher = new SovrynPriceFetcher(sovrynConnection);

    expect(sovrynFetcher !== undefined);
  });

  it('fetches the prices for the pairs passed', async () => {
    const expectedPrices = {values: ['12982.92', '19281.341239', '238982.23'], timestamp: '3283723933'};
    const sovrynConnection = new SovrynConnectionMock(nodeUrl, sovrynHelperContractAddress, expectedPrices);
    const sovrynFetcher = new SovrynPriceFetcher(sovrynConnection);

    const pairs: Pair[] = [
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
