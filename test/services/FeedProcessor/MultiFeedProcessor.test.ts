import {expect} from 'chai';
import sinon, {createStubInstance, SinonStubbedInstance} from 'sinon';

import {FeedFetcher} from '../../../src/types/Feed';
import {getTestContainer} from '../../helpers/getTestContainer';
import MultiFeedProcessor from '../../../src/services/FeedProcessor/MultiFeedProcessor';
import CoingeckoMultiProcessor from '../../../src/services/FeedProcessor/CoingeckoMultiProcessor';
import CryptoCompareMultiProcessor from '../../../src/services/FeedProcessor/CryptoCompareMultiProcessor';

const feedFetchers: FeedFetcher[] = [
  {
    name: 'CryptoComparePrice',
    params: {fsym: 'UMB', tsyms: 'BTC'},
  },
  {
    name: 'CoingeckoPrice',
    params: {id: 'umbrella-network', currency: 'BTC'},
  },
  {
    name: 'CryptoComparePrice',
    params: {fsym: 'UMB', tsyms: 'USD'},
  },
  {
    name: 'CoingeckoPrice',
    params: {id: 'umbrella-network', currency: 'USD'},
  },
];

describe('MultiFeedProcessor', () => {
  let processor: MultiFeedProcessor;
  let cryptoCompareProcessor: SinonStubbedInstance<CryptoCompareMultiProcessor>;
  let coingeckoProcessor: SinonStubbedInstance<CoingeckoMultiProcessor>;

  before(() => {
    const container = getTestContainer();
    coingeckoProcessor = createStubInstance(CoingeckoMultiProcessor);
    cryptoCompareProcessor = createStubInstance(CryptoCompareMultiProcessor);

    container.bind(CoingeckoMultiProcessor).toConstantValue(coingeckoProcessor);
    container.bind(CryptoCompareMultiProcessor).toConstantValue(cryptoCompareProcessor);

    processor = container.get(MultiFeedProcessor);
  });

  after(() => {
    sinon.reset();
  });

  describe('when all processors resolve', () => {
    beforeEach(() => {
      coingeckoProcessor.apply.resolves([undefined, 1, undefined, 3]);
      cryptoCompareProcessor.apply.resolves([0, undefined, 2, undefined]);
    });

    it('returns array full of values', async () => {
      const result = await processor.apply(feedFetchers);

      expect(result).to.deep.equal([0, 1, 2, 3]);
    });
  });

  describe('when one processor rejects', () => {
    beforeEach(() => {
      coingeckoProcessor.apply.resolves([undefined, 1, undefined, 3]);
      cryptoCompareProcessor.apply.rejects('failed to process');
    });

    it('returns the resolved ones', async () => {
      const result = await processor.apply(feedFetchers);

      expect(result).to.deep.equal([undefined, 1, undefined, 3]);
    });
  });

  describe('when all processors rejects', () => {
    beforeEach(() => {
      coingeckoProcessor.apply.rejects();
      cryptoCompareProcessor.apply.rejects();
    });

    it('returns array full of undefined', async () => {
      const result = await processor.apply(feedFetchers);

      expect(result).to.deep.equal([undefined, undefined, undefined, undefined]);
    });
  });
});
