import 'reflect-metadata';
import {Container} from 'inversify';
import sinon, {createStubInstance, SinonStubbedInstance} from 'sinon';
import {expect} from 'chai';

import {getTestContainer} from '../helpers/getTestContainer';
import {mockedLogger} from '../mocks/logger';
import {FeedDataCollector} from '../../src/services/FeedDataCollector';
import {FeedRepository} from '../../src/repositories/FeedRepository';
import {PriceRepository} from '../../src/repositories/PriceRepository';
import {DatumRepository} from '../../src/repositories/DatumRepository';
import Feeds from '../../src/types/Feed';
import FeedDataProcessor from '../../src/services/FeedDataProcessor';

const emptyFeedData = {data: [], prices: []};
const fcdFeed: Feeds = {
  'MAHA-USD': {
    discrepancy: 1,
    precision: 2,
    inputs: [
      {
        fetcher: {
          name: 'CoingeckoPrice',
          params: {
            id: 'mahadao',
            currency: 'USD',
          },
        },
      },
    ],
  },
  'LINK-USD': {
    discrepancy: 1,
    precision: 2,
    inputs: [
      {
        fetcher: {
          name: 'CryptoComparePriceWS',
          params: {
            fsym: 'LINK',
            tsym: 'USD',
          },
        },
      },
    ],
  },
};

const leafFeed: Feeds = {
  'MAHA-USD': {
    discrepancy: 1,
    precision: 2,
    inputs: [
      {
        fetcher: {
          name: 'CryptoComparePriceWS',
          params: {
            fsym: 'MAHA',
            tsym: 'USD',
          },
        },
      },
      {
        fetcher: {
          name: 'CoingeckoPrice',
          params: {
            id: 'mahadao',
            currency: 'USD',
          },
        },
      },
    ],
  },
};

const mergedHttpFeeds: Feeds = {
  'MAHA-USD': {
    discrepancy: 1,
    precision: 2,
    inputs: [
      {
        fetcher: {
          name: 'CoingeckoPrice',
          params: {
            id: 'mahadao',
            currency: 'USD',
          },
        },
      },
    ],
  },
};

describe('FeedDataCollector', () => {
  let feedDataCollector: FeedDataCollector;
  let container: Container;
  let feedRepository: SinonStubbedInstance<FeedRepository>;
  let feedDataProcessor: SinonStubbedInstance<FeedDataProcessor>;
  let priceRepository: SinonStubbedInstance<PriceRepository>;
  let datumRepository: SinonStubbedInstance<DatumRepository>;

  before(() => {
    container = getTestContainer();

    feedRepository = createStubInstance(FeedRepository);
    feedDataProcessor = createStubInstance(FeedDataProcessor);
    priceRepository = createStubInstance(PriceRepository);
    datumRepository = createStubInstance(DatumRepository);

    container.rebind('Logger').toConstantValue(mockedLogger);
    container.bind(FeedRepository).toConstantValue(feedRepository);
    container.bind(PriceRepository).toConstantValue(priceRepository);
    container.bind(DatumRepository).toConstantValue(datumRepository);
    container.bind(FeedDataProcessor).toConstantValue(feedDataProcessor);
    container.bind(FeedDataCollector).to(FeedDataCollector);

    feedDataCollector = container.get(FeedDataCollector);
  });

  afterEach(() => {
    sinon.reset();
  });

  describe('.run', () => {
    describe('when feeds are empty', () => {
      before(async () => {
        feedRepository.getFcdFeeds.resolves({});
        feedRepository.getLeafFeeds.resolves({});
      });

      it('logs and error message', async () => {
        const loggerSpy = sinon.spy(mockedLogger, 'error');

        await feedDataCollector.apply();
        expect(loggerSpy.called).to.be.true;
      });
    });

    describe('when feeds are not empty', () => {
      before(async () => {
        feedRepository.getFcdFeeds.resolves(fcdFeed);
        feedRepository.getLeafFeeds.resolves(leafFeed);
        feedDataProcessor.apply.resolves(emptyFeedData);
      });

      it('calls feedDataProcessor with merged feeds that uses http fetcher', async () => {
        const timestamp = Math.floor(Date.now() / 1000);

        await feedDataCollector.apply();

        expect(feedDataProcessor.apply.calledWith(timestamp, sinon.match(mergedHttpFeeds))).to.be.true;
      });
    });
  });
});
