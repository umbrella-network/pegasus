import chai from 'chai';
import sinon from 'sinon';

import {FeedFetcher} from '../../../src/types/Feed.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';
import MultiFeedProcessor from '../../../src/services/feedProcessors/MultiFeedProcessor.js';
import {FetcherName} from '../../../src/types/fetchers.js';

const {expect} = chai;

const feedFetchers: FeedFetcher[] = [
  {
    name: FetcherName.SovrynPrice,
    params: {fsym: 'UMB', tsym: 'BTC'},
  },
  {
    name: FetcherName.CoingeckoPrice,
    params: {id: 'umbrella-network', currency: 'BTC'},
  },
  {
    name: FetcherName.SovrynPrice,
    params: {fsym: 'UMB', tsym: 'USD'},
  },
  {
    name: FetcherName.CoingeckoPrice,
    params: {id: 'umbrella-network', currency: 'USD'},
  },
];

describe.skip('MultiFeedProcessor', () => {
  let processor: MultiFeedProcessor;

  before(() => {
    const container = getTestContainer();
    processor = container.get(MultiFeedProcessor);
  });

  after(() => {
    sinon.reset();
  });

  describe('when all processors resolve', () => {
    it('returns array full of values', async () => {
      const result = await processor.apply(feedFetchers);
      expect(result).to.deep.equal([0, 1, 2, 3]);
    });
  });

  describe('when one processor rejects', () => {
    it('returns the resolved ones', async () => {
      const result = await processor.apply(feedFetchers);
      expect(result).to.deep.equal([undefined, 1, undefined, 3]);
    });
  });

  describe('when all processors rejects', () => {
    it('returns array full of undefined', async () => {
      const result = await processor.apply(feedFetchers);
      expect(result).to.deep.equal([undefined, undefined, undefined, undefined]);
    });
  });
});
