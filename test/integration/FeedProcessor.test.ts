import 'reflect-metadata';
import chai from 'chai';
import {loadFeeds} from '@umb-network/toolbox';

import FeedProcessor from '../../src/services/FeedProcessor.js';
import {sleep} from '../../src/utils/sleep.js';
import Feeds, {FeedInput} from '../../src/types/Feed.js';
import {getContainer} from '../../src/lib/getContainer.js';
import PriceRepository from '../../src/repositories/PriceRepository.js';
import PolygonIOStockPriceService from '../../src/services/fetchers/common/PolygonIOStockPriceService.js';
import {FetcherName} from '../../src/types/fetchers.js';

const {expect} = chai;

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
const saveStockSymbols = async ({fetcher}: any, priceRepository: PriceRepository) => {
  const timestamp = Math.floor(Date.now() / 1000);
  const price = 10;

  await priceRepository.savePrice(PolygonIOStockPriceService.Prefix, fetcher.params.sym, price, timestamp);
};

const feedsFetcher = [
  {
    apiKey: null,
    name: FetcherName.CoingeckoPrice,
  },
];

const fetcherWSNames = [FetcherName.PolygonIOCryptoPriceOLD];

describe.skip('FeedProcessor integration tests', () => {
  let feedProcessor: FeedProcessor;
  let feeds: Feeds;
  let priceRepository: PriceRepository;

  before(async () => {
    const container = getContainer();

    priceRepository = container.get(PriceRepository);
    feedProcessor = container.get(FeedProcessor);

    feeds = (await loadFeeds('test/feeds/feeds.yaml')) as Feeds;
  });

  describe('when running feeds that uses HTTP', () => {
    feedsFetcher.forEach(({name, apiKey}) => {
      describe(`when running feeds for ${name} fetcher`, () => {
        before(function () {
          if (apiKey && !process.env[apiKey]) {
            console.log(`[HTTP] Skipping some FeedProcessor integration tests that require ${apiKey}`);
            this.skip();
          }
        });

        it(`returns data for leaves for feeds with ${name} fetcher`, async () => {
          const feedsPriceFetcher = getFeedsByFetcher(feeds, name);
          const leaves = await feedProcessor.apply(10, feedsPriceFetcher);

          expect(leaves[0]).to.be.an('array').that.has.lengthOf(Object.keys(feedsPriceFetcher).length);
        }).timeout(10000);
      });
    });
  }).timeout(5000);

  describe('when running feeds that uses WS', () => {
    fetcherWSNames.forEach((name) => {
      describe(`when running feeds for ${name} fetcher`, () => {
        it(`returns data for leaves for feeds with ${name} fetcher`, async () => {
          const feedsPriceFetcher = getFeedsByFetcher(feeds, name);
          const fetcherParams = getFetcherParams(feeds, name);

          await Promise.all(
            fetcherParams.map(async (fetcher) => {
              if (fetcher.fetcher.name === 'PolygonIOPrice') {
                await saveStockSymbols(fetcher, priceRepository);
              }
            }),
          );

          console.log(`feedsPriceFetcher for ${name}: ${Object.keys(feedsPriceFetcher).length}`);
          console.log(`feedsPriceFetcher for ${name}: ${JSON.stringify(feedsPriceFetcher)}`);

          await sleep(1000); // It doesn't get leaves with the same timestamp

          const leaves = await feedProcessor.apply(Math.floor(Date.now() / 1000), feedsPriceFetcher);
          expect(leaves[0]).to.be.an('array').that.has.lengthOf(Object.keys(feedsPriceFetcher).length);
        }).timeout(10000);
      });
    });
  });
});
