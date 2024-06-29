import chai from 'chai';
import sinon, {createStubInstance} from 'sinon';

import {FeedFetcher} from '../../../src/types/Feed.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';
import CoingeckoMultiProcessor from '../../../src/services/FeedProcessor/CoingeckoMultiProcessor.js';
import CoingeckoMultiPriceFetcher, {OutputValues} from '../../../src/services/fetchers/CoingeckoPriceMultiFetcher.js';
import {FetcherName} from '../../../src/types/fetchers.js';
import {PriceDataRepository} from '../../../src/repositories/PriceDataRepository.js';

const {expect} = chai;

const feedFetchers: FeedFetcher[] = [
  {
    name: FetcherName.COINGECKO_PRICE,
    params: {id: 'umbrella-network', currency: 'BTC'},
  },
  {
    name: FetcherName.COINGECKO_PRICE,
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
    const priceDataRepository = createStubInstance(PriceDataRepository);

    container.bind(CoingeckoMultiPriceFetcher).toConstantValue(fetcher);
    container.bind(PriceDataRepository).toConstantValue(priceDataRepository);

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
            name: 'OtherFetcher' as FetcherName,
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
            name: FetcherName.COINGECKO_PRICE,
            params: {id: 'paramThatDoesNotExist', currency: 'fiat'},
          },
        ];

        const outputs = await processor.apply(fetchers);

        expect(outputs).to.deep.equal([0.0000022, 0.1, undefined]);
      });
    });
  });
});
