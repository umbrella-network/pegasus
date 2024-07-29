import chai from 'chai';
import {DeviationFeedFactory} from '../../src/factories/DeviationFeedFactory.js';
import {ChainsIds} from '../../src/types/ChainsIds.js';
import {DeviationFeed} from '../../src/types/DeviationFeeds.js';
import {Feed} from '../../src/types/Feed.js';
import {FetcherName} from '../../src/types/fetchers.js';

const {expect} = chai;

describe('DeviationDataToSignFactory', () => {
  describe('#create', () => {
    it('should return a DeviationFeed if valid data is provided', () => {
      const feed: Feed = {
        discrepancy: 0.1,
        precision: 2,
        heartbeat: 10,
        trigger: 5,
        chains: [ChainsIds.BSC],
        interval: 10,
        inputs: [
          {
            fetcher: {
              name: FetcherName.CoingeckoPrice,
            },
          },
        ],
      };

      const result = DeviationFeedFactory.create('TEST', feed);

      const expected: DeviationFeed = {
        discrepancy: 0.1,
        precision: 2,
        heartbeat: 10,
        chains: [ChainsIds.BSC],
        trigger: 5,
        interval: 10,
        inputs: [
          {
            fetcher: {
              name: FetcherName.CoingeckoPrice,
            },
          },
        ],
      };

      expect(result).to.be.eql(expected);
    });

    it('should return a DeviationFeed with interval set as zero if it is not provided', () => {
      const feed: Feed = {
        discrepancy: 0.1,
        precision: 2,
        heartbeat: 10,
        trigger: 5,
        chains: [ChainsIds.BSC],
        inputs: [
          {
            fetcher: {
              name: FetcherName.CoingeckoPrice,
            },
          },
        ],
      };

      const result = DeviationFeedFactory.create('TEST', feed);

      const expected: DeviationFeed = {
        discrepancy: 0.1,
        precision: 2,
        heartbeat: 10,
        chains: [ChainsIds.BSC],
        trigger: 5,
        interval: 0,
        inputs: [
          {
            fetcher: {
              name: FetcherName.CoingeckoPrice,
            },
          },
        ],
      };

      expect(result).to.be.eql(expected);
    });

    it('should throw an error if no heartbeat is set for the provided feed', () => {
      const feed: Feed = {
        discrepancy: 0.1,
        precision: 2,
        interval: 10,
        trigger: 5,
        chains: [ChainsIds.BSC],
        inputs: [
          {
            fetcher: {
              name: FetcherName.CoingeckoPrice,
            },
          },
        ],
      };

      expect(() => DeviationFeedFactory.create('TEST', feed)).to.throw(
        Error,
        '[IntervalTriggerFilter] empty heartbeat for TEST',
      );
    });

    it('should throw an error if no trigger is set for the provided feed', () => {
      const feed: Feed = {
        discrepancy: 0.1,
        precision: 2,
        heartbeat: 10,
        interval: 10,
        chains: [ChainsIds.BSC],
        inputs: [
          {
            fetcher: {
              name: FetcherName.CoingeckoPrice,
            },
          },
        ],
      };

      expect(() => DeviationFeedFactory.create('TEST', feed)).to.throw(
        Error,
        '[IntervalTriggerFilter] empty trigger for TEST',
      );
    });
  });
});
