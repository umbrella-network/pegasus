import chai from 'chai';
import sinon, {createStubInstance} from 'sinon';

import {FeedFetcher} from '../../../src/types/Feed.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';
import CryptoCompareMultiProcessor from '../../../src/services/FeedProcessor/CryptoCompareMultiProcessor.js';
import CryptoCompareMultiPriceFetcher, {
  OutputValue,
} from '../../../src/services/fetchers/CryptoComparePriceMultiFetcher.js';
import {FetcherName} from '../../../src/types/fetchers.js';

const {expect} = chai;

const feedFetchers: FeedFetcher[] = [
  {
    name: FetcherName.CRYPTO_COMPARE_PRICE,
    params: {fsym: 'UMB', tsyms: 'BTC'},
  },
  {
    name: FetcherName.CRYPTO_COMPARE_PRICE,
    params: {fsym: 'UMB', tsyms: 'USD'},
  },
];

const outputValues: OutputValue[] = [
  {
    fsym: 'UMB',
    tsym: 'USD',
    value: 0.1,
  },
  {
    fsym: 'UMB',
    tsym: 'BTC',
    value: 0.0000022,
  },
];

describe('CryptoCompareMultiProcessor', () => {
  let processor: CryptoCompareMultiProcessor;

  before(async () => {
    const container = getTestContainer();

    const fetcher = createStubInstance(CryptoCompareMultiPriceFetcher);
    container.bind(CryptoCompareMultiPriceFetcher).toConstantValue(fetcher);

    processor = container.get(CryptoCompareMultiProcessor);

    fetcher.apply.resolves(outputValues);
  });

  after(() => {
    sinon.reset();
  });

  describe('#apply', () => {
    describe('with all CryptoCompare fetchers', () => {
      it('returns fetched outputs ordered with the input', async () => {
        const outputs = await processor.apply(feedFetchers);

        expect(outputs).to.deep.equal([0.0000022, 0.1]);
      });
    });

    describe('with fetchers other than CryptoCompare', () => {
      it('returns an empty space in the output', async () => {
        const fetchers = [
          ...feedFetchers,
          {
            name: 'OtherFetcher' as FetcherName,
            params: {from: 'crypto', to: 'fiat'},
          },
        ];

        const outputs = await processor.apply(fetchers);

        expect(outputs).to.deep.equal([0.0000022, 0.1, undefined]);
      });
    });
  });
});
