import chai from 'chai';
import {PriceDataFactory} from '../../src/factories/PriceDataFactory.js';
import Leaf from '../../src/types/Leaf.js';
import {DeviationFeed, DeviationFeeds, PriceData, PriceDataByKey} from '../../src/types/DeviationFeeds.js';
import {ChainsIds} from '../../src/types/ChainsIds.js';
import {FetcherName} from '../../src/types/fetchers.js';

const {expect} = chai;

describe('PriceDataFactory', () => {
  describe('#create', () => {
    it('should return a PriceData object based off the provided data', () => {
      const dataTimestamp = 1683807742;

      const leaf: Leaf = {label: 'TEST1', valueBytes: '0x12345678910'};

      const feed: DeviationFeed = {
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

      const result = PriceDataFactory.create(dataTimestamp, leaf, feed);

      const expected: PriceData = {data: 0, price: 125n, timestamp: 1683807742, heartbeat: 10};

      expect(result).to.be.eql(expected);
    });
  });
  describe('#createMany', () => {
    it('should return a PriceDataByKey object based off the provided data', () => {
      const dataTimestamp = 1683807742;

      const leaves: Leaf[] = [
        {label: 'TEST1', valueBytes: '0x12345678910'},
        {label: 'TEST2', valueBytes: '0x109876543210'},
      ];

      const feeds: DeviationFeeds = {
        TEST1: {
          discrepancy: 0.1,
          precision: 2,
          heartbeat: 10,
          chains: [ChainsIds.BSC],
          trigger: 5,
          interval: 10,
          inputs: [
            {
              fetcher: {
                name: 'TEST1Fetcher' as FetcherName,
              },
            },
          ],
        },
        TEST2: {
          discrepancy: 0.2,
          precision: 4,
          heartbeat: 20,
          chains: [ChainsIds.BSC],
          trigger: 10,
          interval: 20,
          inputs: [
            {
              fetcher: {
                name: 'TEST2Fetcher' as FetcherName,
              },
            },
          ],
        },
      };

      const result = PriceDataFactory.createMany(dataTimestamp, leaves, feeds);

      const expected: PriceDataByKey = {
        TEST1: {
          data: 0,
          price: 125n,
          timestamp: 1683807742,
          heartbeat: 10,
          key: 'TEST1',
        },
        TEST2: {
          data: 0,
          price: 1824n,
          timestamp: 1683807742,
          heartbeat: 20,
          key: 'TEST2',
        },
      };

      expect(result).to.be.eql(expected);
    });
  });
});
