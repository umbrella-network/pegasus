import chai from 'chai';
import {DeviationFeedsPerChainSplitter} from '../../../src/services/deviationsFeeds/DeviationFeedsPerChainSplitter.js';
import {DeviationFeeds} from '../../../src/types/DeviationFeeds.js';
import {ChainsIds} from '../../../src/types/ChainsIds.js';
import {FetcherName} from '../../../src/types/fetchers.js';

const {expect} = chai;

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
              name: FetcherName.COINGECKO_PRICE,
            },
          },
          {
            fetcher: {
              name: FetcherName.CRYPTO_COMPARE_PRICE,
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
