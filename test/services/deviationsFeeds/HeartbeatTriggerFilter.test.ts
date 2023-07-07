import {expect} from 'chai';
import {HeartbeatTriggerFilter} from '../../../src/services/deviationsFeeds/HeartbeatTriggerFilter';
import {ChainsIds} from '../../../src/types/ChainsIds';
import {DeviationFeed, PriceData} from '../../../src/types/DeviationFeeds';


describe('HeartbeatTriggerFilter', () => {
  describe('#apply', () => {
    const dataTimestamp = 10_000;

    const feed: DeviationFeed = {
      heartbeat: 500,
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
      heartbeat: feed.heartbeat,
      timestamp: dataTimestamp,
      data: 50,
    };

    it('FALSE when price was just updated', () => {
      expect(HeartbeatTriggerFilter.apply(dataTimestamp, feed, priceData)).to.be.false;
    });

    it('FALSE when heartbeat (with padding) is not triggered', () => {
      expect(HeartbeatTriggerFilter.apply(priceData.timestamp - 5 * 60, feed, priceData)).to.be.false;
    });

    it('TRUE when heartbeat differs', () => {
      const data = {
        ...priceData,
        heartbeat: 1
      }

      expect(HeartbeatTriggerFilter.apply(dataTimestamp, feed, data)).to.be.true;
    });

    it('TRUE when heartbeat triggered', () => {
      expect(HeartbeatTriggerFilter.apply(priceData.timestamp - 5 * 60 + 1, feed, priceData)).to.be.true;
    });

    it('TRUE when price is very old', () => {
      const data = {
        ...priceData,
        timestamp: 1
      }

      expect(HeartbeatTriggerFilter.apply(dataTimestamp, feed, data)).to.be.true;
    });
  });
});
