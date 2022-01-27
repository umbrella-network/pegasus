// TODO: This test needs significant rewriting
// import 'reflect-metadata';
//
// import {loadTestEnv} from '../helpers/loadTestEnv';
// import FeedProcessor from '../../src/services/FeedProcessor';
// import {loadFeeds} from '@umb-network/toolbox';
// import {expect} from 'chai';
//
// import Feeds from '../../src/types/Feed';
// import {testingLogger} from '../helpers/testingLogger';
// import {getContainer} from '../../src/lib/getContainer';
//
// const config = loadTestEnv();
//
// describe('FeedProcessor integration tests', () => {
//   let feedProcessor: FeedProcessor;
//   let feeds: Feeds;
//
//   beforeEach(async () => {
//     const container = getContainer();
//     feedProcessor = container.get(FeedProcessor);
//     feeds = await loadFeeds('test/feeds/feeds.yaml');
//   });
//
//   if (config.CRYPTOCOMPARE_API_KEY) {
//     it('returns data for feeds with CryptoCompareHistoDay fetcher', async () => {
//       const feedsWithCryptoCompareHistoDayFetcher = Object.keys(feeds)
//         .filter((feedName) => feeds[feedName].inputs[0].fetcher.name === 'CryptoCompareHistoDay')
//         .reduce((acc, feedName) => ({...acc, [feedName]: feeds[feedName]}), {} as Feeds);
//
//       const leaves = await feedProcessor.apply(10, feedsWithCryptoCompareHistoDayFetcher);
//
//       expect(leaves).to.be.an('array').that.has.lengthOf(Object.keys(feedsWithCryptoCompareHistoDayFetcher).length);
//     });
//
//     it('returns data for feeds with CryptoCompareHistoHour fetcher', async () => {
//       const feedsWithCryptoCompareHistoHourFetcher = Object.keys(feeds)
//         .filter((feedName) => feeds[feedName].inputs[0].fetcher.name === 'CryptoCompareHistoHour')
//         .reduce((acc, feedName) => ({...acc, [feedName]: feeds[feedName]}), {} as Feeds);
//
//       const leaves = await feedProcessor.apply(10, feedsWithCryptoCompareHistoHourFetcher);
//
//       expect(leaves).to.be.an('array').that.has.lengthOf(Object.keys(feedsWithCryptoCompareHistoHourFetcher).length);
//     });
//   } else {
//     testingLogger.warn('Skipping some FeedProcessor integration tests that require CRYPTOCOMPARE_API_KEY');
//   }
//
//   if (config.GENESIS_VOLATILITY_API_KEY) {
//     it('returns data for feeds with GVolImpliedVolatility fetcher', async () => {
//       const feedsWithGVolImpliedVolatilityFetcher = Object.keys(feeds)
//         .filter((feedName) => feeds[feedName].inputs[0].fetcher.name === 'GVolImpliedVolatility')
//         .reduce((acc, feedName) => ({...acc, [feedName]: feeds[feedName]}), {} as Feeds);
//
//       const leaves = await feedProcessor.apply(10, feedsWithGVolImpliedVolatilityFetcher);
//
//       expect(leaves).to.be.an('array').that.has.lengthOf(Object.keys(feedsWithGVolImpliedVolatilityFetcher).length);
//     });
//   } else {
//     testingLogger.warn('Skipping some FeedProcessor integration tests that require GENESIS_VOLATILITY_API_KEY');
//   }
// });
