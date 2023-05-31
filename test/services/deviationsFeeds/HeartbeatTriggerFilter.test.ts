import {expect} from 'chai';
import {HeartbeatTriggerFilter} from '../../../src/services/deviationsFeeds/HeartbeatTriggerFilter';
import {ChainsIds} from '../../../src/types/ChainsIds';
import {DeviationFeed, PriceData} from '../../../src/types/DeviationFeeds';

describe('HeartbeatTriggerFilter', () => {
  describe('#apply', () => {
    describe('feed and priceData heartbeats match', () => {
      it('should return true if the difference between the provided timestamp and `priceData` timestamp is greater than `feed` heartbeat', () => {
        const dataTimestamp = 1683839930;

        const feed: DeviationFeed = {
          heartbeat: 55,
          trigger: 100,
          interval: 10,
          chains: [ChainsIds.BSC],
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
        };

        const priceData: PriceData = {
          price: BigInt(1),
          heartbeat: 55,
          timestamp: 1683838924,
          data: 50,
        };

        const result = HeartbeatTriggerFilter.apply(dataTimestamp, feed, priceData);

        expect(result).to.be.eql(true);
      });

      it('should return false if the difference between the provided timestamp and `priceData` timestamp is smaller than `feed` heartbeat', () => {
        const dataTimestamp = 1683838930;

        const feed: DeviationFeed = {
          heartbeat: 55,
          trigger: 100,
          interval: 10,
          chains: [ChainsIds.BSC],
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
        };

        const priceData: PriceData = {
          price: BigInt(1),
          heartbeat: 55,
          timestamp: 1683838924,
          data: 50,
        };

        const result = HeartbeatTriggerFilter.apply(dataTimestamp, feed, priceData);

        expect(result).to.be.eql(false);
      });
    });
    describe('feed and priceData heartbeats do not match', () => {
      it('should return true', () => {
        const dataTimestamp = 1683838924;

        const feed: DeviationFeed = {
          heartbeat: 50,
          trigger: 100,
          interval: 10,
          chains: [ChainsIds.BSC],
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
        };

        const priceData: PriceData = {
          price: BigInt(1),
          heartbeat: 55,
          timestamp: 1683807742,
          data: 50,
        };

        const result = HeartbeatTriggerFilter.apply(dataTimestamp, feed, priceData);

        expect(result).to.be.eql(true);
      });
    });
  });
});
