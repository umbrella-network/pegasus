import 'reflect-metadata';
import sinon from 'sinon';
import {expect} from 'chai';
import {Container} from 'inversify';
import {PriceTriggerFilter} from '../../../src/services/deviationsFeeds/PriceTriggerFilter';
import {mockedLogger} from '../../mocks/logger';
import {DeviationFeed, PriceData} from '../../../src/types/DeviationFeeds';
import {ChainsIds} from '../../../src/types/ChainsIds';
import Leaf from '../../../src/types/Leaf';

describe('PriceTriggerFilter', () => {
  let priceTriggerFilter: PriceTriggerFilter;

  beforeEach(async () => {
    const container = new Container();
    container.bind('Logger').toConstantValue(mockedLogger);
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

      const result = priceTriggerFilter.apply(feed, leaf, priceData);
      expect(result).to.be.eql(false);
    });

    it('should return false if priceDiff is not triggered', () => {
      const loggerSpy = sinon.spy(mockedLogger, 'info');

      const priceData: PriceData = {
        price: 125n,
        heartbeat: 55,
        timestamp: 1683807742,
        data: 50,
      };

      const leaf: Leaf = {label: 'ETH-USD', valueBytes: '0x11345678910'};

      const result = priceTriggerFilter.apply(feed, leaf, priceData);
      expect(result).to.be.eql(false);

      expect(loggerSpy.calledWithExactly(sinon.match(`[PriceTriggerFilter] ETH-USD priceDiff not triggered 7:125`))).to
        .be.true;
    });

    it('should return true if priceDiff is triggered', () => {
      const loggerSpy = sinon.spy(mockedLogger, 'info');

      const priceData: PriceData = {
        price: 125n,
        heartbeat: 55,
        timestamp: 1683807742,
        data: 50,
      };

      const leaf: Leaf = {label: 'ETH-USD', valueBytes: '0x1234567891011'};

      const result = priceTriggerFilter.apply(feed, leaf, priceData);
      expect(result).to.be.eql(true);

      expect(loggerSpy.calledWithExactly(sinon.match(`[PriceTriggerFilter] ETH-USD priceDiff not triggered 31900:125`)))
        .to.be.false;
    });
  });
});
