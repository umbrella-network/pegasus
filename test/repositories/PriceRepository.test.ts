import 'reflect-metadata';
import sinon from 'sinon';
import chai from 'chai';

import PriceRepository from '../../src/repositories/PriceRepository.js';
import PriceAggregator from '../../src/services/PriceAggregator.js';
import Settings from '../../src/types/Settings.js';
import {PairWithFreshness} from '../../src/types/Feed.js';
import {getTestContainer} from '../helpers/getTestContainer.js';

const {expect} = chai;

describe('PriceRepository', () => {
  let settings: Settings;
  let priceRepository: PriceRepository;
  let mockedPriceAggregator: sinon.SinonStubbedInstance<PriceAggregator>;

  const prefix = 'test::';

  beforeEach(() => {
    mockedPriceAggregator = sinon.createStubInstance(PriceAggregator);

    const container = getTestContainer();

    container.rebind('Settings').toConstantValue(settings);
    container.bind(PriceRepository).to(PriceRepository);
    container.bind(PriceAggregator).toConstantValue(mockedPriceAggregator as unknown as PriceAggregator);

    priceRepository = container.get(PriceRepository);
  });

  describe('savePrice', () => {
    it('calls aggregator with proper data format', async () => {
      const pair = 'fsym1-tsym1';
      const price = 10000;
      const timestamp = Date.now();

      await priceRepository.savePrice(prefix, pair, price, timestamp);

      const expectedKey = `${prefix}${pair.toUpperCase().replace('-', '~')}`;

      expect(mockedPriceAggregator.add.calledWithExactly(expectedKey, price, timestamp)).to.be.true;
    });
  });

  describe('getLatestPrice', () => {
    it('calls aggregator and returns a number', async () => {
      const pair: PairWithFreshness = {
        symbol: 'FSYM1',
        tsym: 'TSYM1',
        freshness: 1000,
      };

      const timestamp = 20000;

      mockedPriceAggregator.valueAfter.resolves(1000);

      const value = await priceRepository.getLatestPrice(prefix, pair, timestamp);

      const expectedKey = `${prefix}${pair.symbol}~${pair.tsym}`;

      expect(mockedPriceAggregator.valueAfter.getCall(0).args).to.eql([expectedKey, 20000, 19000]);
      expect(value).to.eq(1000);
    });
  });

  describe('getLatestPrices', () => {
    it('calls aggregator the exact number of times with the exact parameters', async () => {
      const pair1: PairWithFreshness = {
        symbol: 'FSYM1',
        tsym: 'TSYM1',
        freshness: 1000,
      };

      const pair2: PairWithFreshness = {
        symbol: 'FSYM2',
        tsym: 'TSYM2',
        freshness: 1000,
      };

      const pairs = [pair1, pair2];
      const timestamp = 100000;

      mockedPriceAggregator.valueTimestamp.resolves();

      await priceRepository.getLatestPrices(prefix, pairs, timestamp);

      const expectedArgs = [
        ['test::FSYM1~TSYM1', timestamp],
        ['test::FSYM2~TSYM2', timestamp],
      ];
      mockedPriceAggregator.valueTimestamp.getCalls().forEach((call, idx) => {
        expect(call.args).to.be.eql(expectedArgs[idx]);
      });
    });
  });

  describe('getAllPrices', () => {
    it('calls aggregator with the proper parameters', async () => {
      const pair: PairWithFreshness = {
        symbol: 'FSYM1',
        tsym: 'TSYM1',
        freshness: 1000,
      };

      await priceRepository.getAllPrices(prefix, pair);

      expect(mockedPriceAggregator.valueTimestamps.calledWith(`${prefix}${pair.symbol}~${pair.tsym}`)).to.be.true;
    });
  });
});
