import 'reflect-metadata';

import FeedProcessor from '../../src/services/FeedProcessor';
import {loadFeeds} from '@umb-network/toolbox';
import {expect} from 'chai';

import {sleep} from '../../src/utils/sleep';
import Feeds, {FeedInput} from '../../src/types/Feed';
import {mockedLogger} from '../mocks/logger';
import {getContainer} from '../../src/lib/getContainer';
import {PriceRepository} from '../../src/repositories/PriceRepository';
import PolygonIOStockPriceService from '../../src/services/PolygonIOStockPriceService';
import CryptoCompareWSClient from '../../src/services/ws/CryptoCompareWSClient';
import {getModelForClass, mongoose} from '@typegoose/typegoose';
import {Price} from '../../src/models/Price';
import {loadTestEnv} from '../helpers/loadTestEnv';

const getFeedsByFetcher = (feeds: Feeds, fetcherName: string): Feeds => {
  return Object.keys(feeds)
    .filter((feedName) => feeds[feedName].inputs.some((input) => input.fetcher.name === fetcherName))
    .reduce((acc, feedName) => ({...acc, [feedName]: feeds[feedName]}), {} as Feeds);
};

const getFetcherParams = (feeds: Feeds, fetcherName: string) => {
  const params: FeedInput[] = [];

  Object.keys(feeds).forEach((feedName) => {
    const fetcher = feeds[feedName].inputs.filter((input) => input.fetcher.name === fetcherName);
    if (fetcher.length) params.push(fetcher[0]);
  });

  return params;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const saveCryptoPairs = async ({fetcher}: any, priceRepository: PriceRepository) => {
  const timestamp = new Date(Math.floor(Date.now() / 1000));
  const price = 10;

  await priceRepository.saveBatch([
    {
      source: CryptoCompareWSClient.Source,
      symbol: `${fetcher.params.fsym}-${fetcher.params.tsym}`,
      value: price,
      timestamp,
    },
  ]);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const saveStockSymbols = async ({fetcher}: any, priceRepository: PriceRepository) => {
  const timestamp = new Date(Math.floor(Date.now() / 1000));
  const price = 10;

  await priceRepository.saveBatch([
    {
      source: PolygonIOStockPriceService.Source,
      symbol: fetcher.params.sym,
      value: price,
      timestamp,
    },
  ]);
};

const feedsFetcher = [
  {
    apiKey: 'CRYPTOCOMPARE_API_KEY',
    name: 'CryptoCompareHistoDay',
  },
  {
    apiKey: 'CRYPTOCOMPARE_API_KEY',
    name: 'CryptoCompareHistoHour',
  },
  {
    apiKey: 'CRYPTOCOMPARE_API_KEY',
    name: 'CryptoComparePrice',
  },
  {
    apiKey: 'CRYPTOCOMPARE_API_KEY',
    name: 'CoinmarketcapPrice',
  },
  {
    apiKey: 'IEX_API_KEY',
    name: 'IEXEnergy',
  },
  {
    apiKey: null,
    name: 'CoingeckoPrice',
  },
];

const fetcherWSNames = ['CryptoComparePriceWS', 'PolygonIOCryptoPrice', 'PolygonIOPrice'];

describe('FeedProcessor integration tests', () => {
  let feedProcessor: FeedProcessor;
  let feeds: Feeds;
  let priceRepository: PriceRepository;

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});

    const container = getContainer();

    priceRepository = container.get(PriceRepository);
    feedProcessor = container.get(FeedProcessor);
    feeds = await loadFeeds('test/feeds/feeds.yaml');
  });

  afterEach(async () => {
    await getModelForClass(Price).deleteMany({});
  });

  after(async () => {
    await mongoose.connection.close();
  });

  describe('when running feeds that uses HTTP', () => {
    feedsFetcher.forEach(({name, apiKey}) => {
      describe(`when running feeds for ${name} fetcher`, () => {
        before(function () {
          if (apiKey && !process.env[apiKey]) {
            mockedLogger.warn(`Skipping some FeedProcessor integration tests that require ${apiKey}`);
            this.skip();
          }
        });

        it(`returns data for leaves for feeds with ${name} fetcher`, async () => {
          const feedsPriceFetcher = getFeedsByFetcher(feeds, name);
          const leaves = await feedProcessor.apply(10, feedsPriceFetcher);

          expect(leaves[0]).to.be.an('array').that.has.lengthOf(Object.keys(feedsPriceFetcher).length);
        });
      });
    });
  });

  describe.skip('when running feeds that uses WS', () => {
    fetcherWSNames.forEach((name) => {
      describe(`when running feeds for ${name} fetcher`, () => {
        it(`returns data for leaves for feeds with ${name} fetcher`, async () => {
          const feedsPriceFetcher = getFeedsByFetcher(feeds, name);
          const fetcherParams = getFetcherParams(feeds, name);

          await Promise.all(
            fetcherParams.map(async (fetcher) => {
              if (fetcher.fetcher.name === 'PolygonIOPrice') {
                await saveStockSymbols(fetcher, priceRepository);
              } else {
                await saveCryptoPairs(fetcher, priceRepository);
              }
            }),
          );

          await sleep(1000); // It doesn't get leaves with the same timestamp

          const leaves = await feedProcessor.apply(Math.floor(Date.now() / 1000), feedsPriceFetcher);
          expect(leaves[0]).to.be.an('array').that.has.lengthOf(Object.keys(feedsPriceFetcher).length);
        });
      });
    });
  });
});
