import 'reflect-metadata';
import sinon from 'sinon';
import chai from 'chai';

import {PriceTriggerFilter} from '../../../src/services/deviationsFeeds/PriceTriggerFilter.js';
import {DeviationFeed, PriceData} from '../../../src/types/DeviationFeeds.js';
import {ChainsIds} from '../../../src/types/ChainsIds.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';
import {FetcherName} from '../../../src/types/fetchers.js';
import Leaf from '../../../src/types/Leaf.js';

const {expect} = chai;

describe('PriceTriggerFilter', () => {
  let priceTriggerFilter: PriceTriggerFilter;

  beforeEach(async () => {
    const container = getTestContainer();
    container.bind(PriceTriggerFilter).toSelf();
    priceTriggerFilter = container.get(PriceTriggerFilter);
  });

  describe('#apply', () => {
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
    };

    afterEach(() => {
      sinon.restore();
    });

    it('should return false if adjusted price difference is zero', () => {
      const priceData: PriceData = {
        price: 125n,
        heartbeat: 55,
        timestamp: 1683807742,
        data: 50,
      };

      const leaf: Leaf = {label: 'ETH-USD', valueBytes: '0x12345678910'};

      const {result} = priceTriggerFilter.apply(feed, leaf, priceData);
      expect(result).to.be.eql(false);
    });

    it('should return false if priceDiff is not triggered', () => {
      const priceData: PriceData = {
        price: 125n,
        heartbeat: 55,
        timestamp: 1683807742,
        data: 50,
      };

      const leaf: Leaf = {label: 'ETH-USD', valueBytes: `0x${(125e10 * 2 - 1e8).toString(16)}`};

      const {result, msg} = priceTriggerFilter.apply(feed, leaf, priceData);
      expect(result).to.be.eql(false);
      expect(msg).to.be.eql('ETH-USD: low priceDiff 124@99.2%:100%');
    });

    it('should return true if priceDiff is triggered', () => {
      const priceData: PriceData = {
        price: BigInt(125e8),
        heartbeat: 55,
        timestamp: 1683807742,
        data: 50,
      };

      const leaf: Leaf = {label: 'ETH-USD', valueBytes: `0x${(125e18 * 2).toString(16)}`};

      const {result, msg} = priceTriggerFilter.apply(feed, leaf, priceData);
      expect(msg).to.eql('ETH-USD: 12500000000 =(100%)=> 25000000000');
      expect(result).to.be.eql(true);
    });
  });
});
