import chai from 'chai';

import {DeviationDataToSignFactory} from '../../src/factories/DeviationDataToSignFactory.js';
import {ChainsIds} from '../../src/types/ChainsIds.js';
import {FetcherName} from '../../src/types/fetchers.js';
import {DeviationFeeds} from '../../src/types/DeviationFeeds.js';

const {expect} = chai;

describe('DeviationDataToSignFactory', () => {
  describe('#create', () => {
    it('should format data as deviation data to sign', () => {
      const dataTimestamp = 1683807742;

      const chainsAndKeys = [{chainId: 'BSC', keys: ['TEST1']}];

      const leaves = {TEST1: {label: 'TEST1', valueBytes: '0x12345678910'}};

      const feeds: DeviationFeeds = {
        TEST1: {
          heartbeat: 55,
          trigger: 100,
          interval: 10,
          chains: [ChainsIds.BSC],
          discrepancy: 0.1,
          precision: 2,
          inputs: [
            {
              fetcher: {
                name: FetcherName.CoingeckoPrice,
                params: {
                  ticker: '',
                },
              },
            },
            {
              fetcher: {
                name: FetcherName.SovrynPrice,
                params: {
                  ticker: '',
                },
              },
            },
          ],
        },
      };

      const result = DeviationDataToSignFactory.create(dataTimestamp, chainsAndKeys, leaves, feeds);

      const expected = {
        dataTimestamp: 1683807742,
        leaves: {TEST1: '0x12345678910'},
        feedsForChain: {BSC: ['TEST1']},
        proposedPriceData: {
          TEST1: {data: 0, price: 125n, timestamp: 1683807742, heartbeat: 55},
        },
      };

      expect(result).to.be.eql(expected);
    });

    it('should skip undefined data passed as chainsAndKeys', () => {
      const dataTimestamp = 1683807742;

      const chainsAndKeys = [undefined, {chainId: 'BSC', keys: ['TEST1']}, undefined];

      const leaves = {TEST1: {label: 'TEST1', valueBytes: '0x12345678910'}};

      const feeds: DeviationFeeds = {
        TEST1: {
          heartbeat: 55,
          trigger: 100,
          interval: 10,
          chains: [ChainsIds.BSC],
          discrepancy: 0.1,
          precision: 2,
          inputs: [
            {
              fetcher: {
                name: FetcherName.CoingeckoPrice,
                params: {
                  ticker: '',
                },
              },
            },
            {
              fetcher: {
                name: FetcherName.SovrynPrice,
                params: {
                  ticker: '',
                },
              },
            },
          ],
        },
      };

      const result = DeviationDataToSignFactory.create(dataTimestamp, chainsAndKeys, leaves, feeds);

      const expected = {
        dataTimestamp: 1683807742,
        leaves: {TEST1: '0x12345678910'},
        feedsForChain: {BSC: ['TEST1']},
        proposedPriceData: {
          TEST1: {data: 0, price: 125n, timestamp: 1683807742, heartbeat: 55},
        },
      };

      expect(result).to.be.eql(expected);
    });

    it('should return undefined if no valid data to sign is passed', () => {
      const dataTimestamp = 1683807742;

      const chainsAndKeys = [undefined, undefined];

      const leaves = {TEST1: {label: 'TEST1', valueBytes: '0x12345678910'}};

      const feeds: DeviationFeeds = {
        TEST1: {
          heartbeat: 55,
          trigger: 100,
          interval: 10,
          chains: [ChainsIds.BSC],
          discrepancy: 0.1,
          precision: 2,
          inputs: [
            {
              fetcher: {
                name: FetcherName.CoingeckoPrice,
                params: {
                  ticker: '',
                },
              },
            },
            {
              fetcher: {
                name: FetcherName.SovrynPrice,
                params: {
                  ticker: '',
                },
              },
            },
          ],
        },
      };

      const result = DeviationDataToSignFactory.create(dataTimestamp, chainsAndKeys, leaves, feeds);

      expect(result).to.be.eql(undefined);
    });
  });
});
