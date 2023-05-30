import {expect} from 'chai';
import {DeviationFeedsPerChainSplitter} from '../../../src/services/deviationsFeeds/DeviationFeedsPerChainSplitter';
import {DeviationFeeds} from '../../../src/types/DeviationFeeds';
import {ChainsIds} from '../../../src/types/ChainsIds';

describe('DeviationFeedsPerChainSplitter', () => {
  describe('apply', () => {
    const data: DeviationFeeds = {
      TEST: {
        heartbeat: 50,
        trigger: 100,
        interval: 10,
        chains: [ChainsIds.BSC, ChainsIds.ARBITRUM],
        discrepancy: 0.1,
        precision: 2,
        inputs: [
          {
            fetcher: {
              name: 'CoingeckoPrice',
            },
          },
          {
            fetcher: {
              name: 'CryptoComparePrice',
            },
          },
        ],
      },
    };

    it('should return only the data associated with the accepted keys', () => {
      const result = DeviationFeedsPerChainSplitter.apply(data);

      expect(result).to.be.eql({bsc: ['TEST'], arbitrum: ['TEST']});
    });
  });
});
