import {expect} from 'chai';

import {FeedFetcher} from '../../../src/types/Feed';
import {getTestContainer} from '../../helpers/getTestContainer';
import sinon, {createStubInstance} from 'sinon';
import CoingeckoMultiProcessor from '../../../src/services/FeedProcessor/CoingeckoMultiProcessor';
import CoingeckoMultiPriceFetcher, {OutputValues} from '../../../src/services/fetchers/CoingeckoPriceMultiFetcher';

const feedFetchers: FeedFetcher[] = [
  {
    name: 'CoingeckoPrice',
    params: {id: 'umbrella-network', currency: 'BTC'},
  },
  {
    name: 'CoingeckoPrice',
    params: {id: 'umbrella-network', currency: 'USD'},
  },
];

const outputValues: OutputValues[] = [
  {
    id: 'umbrella-network',
    currency: 'USD',
    value: 0.1,
  },
  {
    id: 'umbrella-network',
    currency: 'BTC',
    value: 0.0000022,
  },
];

describe('CoingeckoMultiProcessor', () => {
  let processor: CoingeckoMultiProcessor;

  before(() => {
    const container = getTestContainer();

    const fetcher = createStubInstance(CoingeckoMultiPriceFetcher);

    container.bind(CoingeckoMultiPriceFetcher).toConstantValue(fetcher);

    processor = container.get(CoingeckoMultiProcessor);

    fetcher.apply.resolves(outputValues);
  });

  after(() => {
    sinon.reset();
  });

  describe('#apply', () => {
    describe('with all Coingecko fetchers', () => {
      it('returns fetched outputs ordered with the input', async () => {
        const outputs = await processor.apply(feedFetchers);

        expect(outputs).to.deep.equal([0.0000022, 0.1]);
      });
    });

    describe('with fetchers other than Coingecko', () => {
      it('returns an empty space in the output', async () => {
        const fetchers = [
          ...feedFetchers,
          {
            name: 'OtherFetcher',
            params: {from: 'crypto', to: 'fiat'},
          },
        ];

        const outputs = await processor.apply(fetchers);

        expect(outputs).to.deep.equal([0.0000022, 0.1, undefined]);
      });
    });

    describe('when price is not returned by the API', () => {
      it('returns an empty space in the output', async () => {
        const fetchers = [
          ...feedFetchers,
          {
            name: 'CoingeckoPrice',
            params: {id: 'paramThatDoesNotExist', currency: 'fiat'},
          },
        ];

        const outputs = await processor.apply(fetchers);

        expect(outputs).to.deep.equal([0.0000022, 0.1, undefined]);
      });
    });
  });
});
