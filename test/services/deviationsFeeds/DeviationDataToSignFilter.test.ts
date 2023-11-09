import chai from 'chai';
import {DeviationDataToSignFilter} from '../../../src/services/deviationsFeeds/DeviationDataToSignFilter.js';
import {DeviationDataToSign} from '../../../src/types/DeviationFeeds.js';

const {expect} = chai;

describe('DeviationDataToSignFilter', () => {
  describe('#apply', () => {
    const dataForConsensus: DeviationDataToSign = {
      dataTimestamp: 1683807742,
      proposedPriceData: {
        TEST: {
          price: BigInt(1),
          heartbeat: 55,
          timestamp: 1683807742,
          data: 50,
        },
        TEST2: {
          price: BigInt(2),
          heartbeat: 56,
          timestamp: 1683807743,
          data: 51,
        },
      },
      feedsForChain: {
        BSC: ['TEST', 'TEST2'],
        ETH: ['TEST', 'TEST2'],
      },
      leaves: {
        TEST: '0x1234',
        TEST2: '0x5678',
      },
    };

    const ignoredKeys = new Set(['TEST2']);

    it('should filter out ignored keys from deviation data', () => {
      const expected: DeviationDataToSign = {
        dataTimestamp: 1683807742,
        proposedPriceData: {
          TEST: {
            price: BigInt(1),
            heartbeat: 55,
            timestamp: 1683807742,
            data: 50,
          },
        },
        feedsForChain: {
          BSC: ['TEST'],
          ETH: ['TEST'],
        },
        leaves: {
          TEST: '0x1234',
        },
      };

      const result = DeviationDataToSignFilter.apply(dataForConsensus, ignoredKeys);

      expect(result).to.be.eql(expected);
    });
  });
});
