import 'reflect-metadata';
import chai from 'chai';
import {Container} from 'inversify';
import sinon, {createStubInstance, SinonStubbedInstance, stub} from 'sinon';
import {LeafValueCoder} from '@umb-network/toolbox';

import {getTestContainer} from '../helpers/getTestContainer.js';
import {FeedFetcherRepository} from '../../src/repositories/FeedFetcherRepository.js';
import FeedProcessor from '../../src/services/FeedProcessor.js';
import {feedFactory, feedInputFactory} from '../mocks/factories/feedFactory.js';
import {FeedFetcherInterface, FetcherName} from '../../src/types/fetchers.js';
import Feeds from '../../src/types/Feed.js';
import Leaf from '../../src/types/Leaf.js';

const {expect} = chai;

describe.skip('FeedProcessor', () => {
  let instance: FeedProcessor;
  let container: Container;
  let testFetcher: FeedFetcherInterface;
  let result: Leaf[][];
  let feedFetcherRepository: SinonStubbedInstance<FeedFetcherRepository>;

  before(() => {
    container = getTestContainer();
    testFetcher = <FeedFetcherInterface>{};

    feedFetcherRepository = createStubInstance(FeedFetcherRepository);

    feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);

    container.bind(FeedFetcherRepository).toConstantValue(feedFetcherRepository);

    instance = container.get(FeedProcessor);
  });

  afterEach(() => {
    sinon.reset();
  });

  describe('.apply', () => {
    describe('when feeds is empty', () => {
      before(async () => {
        result = await instance.apply(10, {});
      });

      it('responds with an empty multidimensional array', () => {
        expect(result).to.deep.equal([[]]);
      });
    });

    describe('when fetcher rejects', () => {
      before(async () => {
        feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);

        const feeds: Feeds = {
          TEST: feedFactory.build(),
        };

        testFetcher.apply = stub().rejects();

        result = await instance.apply(10, feeds);
      });

      it('responds with an empty multidimensional array', () => {
        expect(result).to.deep.equal([[]]);
      });
    });

    describe('when feeds and fetcher exist', () => {
      describe('when feeds key is FIXED', () => {
        before(async () => {
          feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);

          const feeds: Feeds = {
            FIXED_TEST: feedFactory.build({base: 'base', quote: 'quote'}),
          };

          testFetcher.apply = stub().resolves(100.0);

          result = await instance.apply(10, feeds);
        });

        it('responds with a leaf with the correct label', () => {
          expect(result[0]).to.be.an('array').with.lengthOf(1);
          expect(result[0][0].label).to.equal('FIXED_TEST');
        });

        it('responds with a leaf with value decoded as string', () => {
          expect(LeafValueCoder.decode(result[0][0].valueBytes, result[0][0].label)).is.a('string').that.equal('100');
        });
      });

      describe('when fetcher is different than CryptoComparePrice', () => {
        before(async () => {
          feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);

          const feeds: Feeds = {
            TEST: feedFactory.build({base: 'base', quote: 'quote'}),
          };

          testFetcher.apply = stub().resolves(100.0);

          result = await instance.apply(10, feeds);
        });

        it('responds with a leaf with correct label', () => {
          expect(result[0]).to.be.an('array').with.lengthOf(1);
          expect(result[0][0].label).to.equal('TEST');
        });

        it('responds with a leaf with value decoded as number', () => {
          expect(LeafValueCoder.decode(result[0][0].valueBytes, result[0][0].label)).is.a('number').that.equal(100.0);
        });
      });

      describe('when feeds have more inputs for the same feed', () => {
        before(async () => {
          feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);
          testFetcher.apply = stub().resolves(90.3);

          const feeds: Feeds = {
            'BASE-QUOTE': feedFactory.build({
              inputs: [
                feedInputFactory.build({
                  fetcher: {
                    name: 'TestFetcher' as FetcherName,
                    params: {
                      fsym: 'ETH',
                      tsym: 'USD',
                    },
                  },
                }),
                feedInputFactory.build({
                  fetcher: {
                    name: FetcherName.SovrynPrice,
                    params: {
                      fsym: 'ETH',
                      tsym: 'USD',
                    },
                  },
                }),
              ],
            }),
          };

          result = await instance.apply(10, feeds);
        });

        it('responds with a leaf with correct label', () => {
          expect(result[0]).to.be.an('array').with.lengthOf(1);
          expect(result[0][0].label).to.equal('BASE-QUOTE');
        });

        it('responds with a leaf with the mean value', () => {
          expect(LeafValueCoder.decode(result[0][0].valueBytes, result[0][0].label)).is.a('number').that.equal(95.5);
        });
      });

      describe('when processing multi feeds', () => {
        const feeds: Feeds = {
          'UMB-USD': feedFactory.build({
            inputs: [
              feedInputFactory.build({
                fetcher: {
                  name: FetcherName.CoingeckoPrice,
                  params: {
                    id: 'umbrella-network',
                    currency: 'USD',
                  },
                },
              }),
              feedInputFactory.build({
                fetcher: {
                  name: FetcherName.SovrynPrice,
                  params: {
                    fsym: 'UMB',
                    tsym: 'USD',
                  },
                },
              }),
            ],
          }),
          'UMB-BTC': feedFactory.build({
            inputs: [
              feedInputFactory.build({
                fetcher: {
                  name: FetcherName.CoingeckoPrice,
                  params: {
                    id: 'umbrella-network',
                    currency: 'BTC',
                  },
                },
              }),
              feedInputFactory.build({
                fetcher: {
                  name: FetcherName.SovrynPrice,
                  params: {
                    fsym: 'UMB',
                    tsym: 'BTC',
                  },
                },
              }),
            ],
          }),
        };

        describe('and all processors resolve', () => {
          it('returns all leaves', async () => {
            const result = await instance.apply(10, feeds);

            expect(result).to.deep.equal([
              [
                {
                  label: 'UMB-USD',
                  valueBytes: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
                },
                {
                  label: 'UMB-BTC',
                  valueBytes: '0x00000000000000000000000000000000000000000000000022b1c8c1227a0000',
                },
              ],
            ]);
          });
        });

        describe('and one of the processors rejects', () => {
          it('returns only the resolved leaves', async () => {
            const result = await instance.apply(10, feeds);

            expect(result).to.deep.equal([
              [
                {
                  label: 'UMB-USD',
                  valueBytes: '0x0000000000000000000000000000000000000000000000000de0b6b3a7640000',
                },
                {
                  label: 'UMB-BTC',
                  valueBytes: '0x00000000000000000000000000000000000000000000000029a2241af62c0000',
                },
              ],
            ]);
          });
        });

        describe('and all processors rejects', () => {
          it('returns what exactly', async () => {
            const result = await instance.apply(10, feeds);

            expect(result).to.deep.equal([[]]);
          });
        });
      });
    });

    describe('when two valid feeds are given', () => {
      before(async () => {
        feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);

        const feeds1: Feeds = {
          TEST: feedFactory.build(),
        };

        const feeds2: Feeds = {
          'HAHN-USD': feedFactory.build(),
        };

        testFetcher.apply = stub().resolves(100.0);

        result = await instance.apply(10, feeds1, feeds2);
      });

      it('responds with an array that includes two arrays with results', () => {
        expect(result[0]).to.be.an('array').with.lengthOf(1);
        expect(result[1]).to.be.an('array').with.lengthOf(1);
        expect(result[0][0].label).to.equal('TEST');
        expect(result[1][0].label).to.equal('HAHN-USD');
      });

      it('responds with a leaf with value decoded as number', () => {
        expect(LeafValueCoder.decode(result[0][0].valueBytes, result[0][0].label)).is.a('number').that.equal(100.0);
        expect(LeafValueCoder.decode(result[1][0].valueBytes, result[0][0].label)).is.a('number').that.equal(100.0);
      });
    });
  });
});
