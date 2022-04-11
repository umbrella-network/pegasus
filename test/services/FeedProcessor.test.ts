import 'reflect-metadata';
import {Container} from 'inversify';
import sinon, {createStubInstance, SinonStubbedInstance, stub} from 'sinon';
import {expect} from 'chai';
import Feeds from '@umb-network/toolbox/dist/types/Feed';
import {LeafValueCoder} from '@umb-network/toolbox';

import {getTestContainer} from '../helpers/getTestContainer';
import {FeedFetcherRepository, FeedFetcher} from '../../src/repositories/FeedFetcherRepository';
import {CalculatorRepository} from '../../src/repositories/CalculatorRepository';
import FeedProcessor from '../../src/services/FeedProcessor';
import {IdentityCalculator} from '../../src/services/calculators';
import {feedFactory, feedInputFactory} from '../mocks/factories/feedFactory';
import Leaf from '../../src/types/Leaf';

import CryptoCompareMultiProcessor from '../../src/services/FeedProcessor/CryptoCompareMultiProcessor';
import CoingeckoMultiProcessor from '../../src/services/FeedProcessor/CoingeckoMultiProcessor';

describe('FeedProcessor', () => {
  let instance: FeedProcessor;
  let container: Container;
  let testFetcher: FeedFetcher;
  let result: Leaf[][];
  let feedFetcherRepository: SinonStubbedInstance<FeedFetcherRepository>;
  let calculatorRepository: SinonStubbedInstance<CalculatorRepository>;
  let identityCalculator: SinonStubbedInstance<IdentityCalculator>;

  let coingeckoMultiProcessor: SinonStubbedInstance<CoingeckoMultiProcessor>;
  let cryptoCompareMultiProcessor: SinonStubbedInstance<CryptoCompareMultiProcessor>;

  before(() => {
    container = getTestContainer();
    testFetcher = <FeedFetcher>{};

    feedFetcherRepository = createStubInstance(FeedFetcherRepository);
    calculatorRepository = createStubInstance(CalculatorRepository);
    identityCalculator = createStubInstance(IdentityCalculator);
    coingeckoMultiProcessor = createStubInstance(CoingeckoMultiProcessor);
    cryptoCompareMultiProcessor = createStubInstance(CryptoCompareMultiProcessor);

    feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);
    calculatorRepository.find.withArgs('Identity').returns(identityCalculator);

    container.bind(FeedFetcherRepository).toConstantValue(feedFetcherRepository);
    container.bind(CalculatorRepository).toConstantValue(calculatorRepository);
    container.bind(CoingeckoMultiProcessor).toConstantValue(coingeckoMultiProcessor);
    container.bind(CryptoCompareMultiProcessor).toConstantValue(cryptoCompareMultiProcessor);

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

      it('does not call identityCalculator.apply', () => {
        expect(identityCalculator.apply.called).to.be.false;
      });
    });

    describe('when fetcher does not exist', () => {
      before(async () => {
        const feeds: Feeds = {
          TEST: feedFactory.build({inputs: [feedInputFactory.build({fetcher: {name: 'WrongFetcher'}})]}),
        };

        result = await instance.apply(10, feeds);
      });

      it('responds with an empty multidimensional array', () => {
        expect(result).to.deep.equal([[]]);
      });

      it('does not call identityCalculator.apply', () => {
        expect(identityCalculator.apply.called).to.be.false;
      });
    });

    describe('when fetcher rejects', () => {
      before(async () => {
        feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);
        calculatorRepository.find.withArgs('Identity').returns(new IdentityCalculator());

        const feeds: Feeds = {
          TEST: feedFactory.build(),
        };

        testFetcher.apply = stub().rejects();

        result = await instance.apply(10, feeds);
      });

      it('responds with an empty multidimensional array', () => {
        expect(result).to.deep.equal([[]]);
      });

      it('does not call identityCalculator.apply', () => {
        expect(identityCalculator.apply.called).to.be.false;
      });
    });

    describe('when feeds and fetcher exist', () => {
      describe('when feeds key is FIXED', () => {
        before(async () => {
          feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);
          calculatorRepository.find.withArgs('Identity').returns(new IdentityCalculator());

          const feeds: Feeds = {
            FIXED_TEST: feedFactory.build(),
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
          calculatorRepository.find.withArgs('Identity').returns(new IdentityCalculator());

          const feeds: Feeds = {
            TEST: feedFactory.build(),
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
          cryptoCompareMultiProcessor.apply.resolves([100.7]);
          testFetcher.apply = stub().resolves(90.3);
          calculatorRepository.find.withArgs('Identity').returns(new IdentityCalculator());

          const feeds: Feeds = {
            TEST: feedFactory.build({
              inputs: [
                feedInputFactory.build({
                  fetcher: {
                    name: 'TestFetcher',
                    params: {
                      fsym: 'ETH',
                      tsym: 'USD',
                      limit: 24,
                    },
                  },
                }),
                feedInputFactory.build({
                  fetcher: {
                    name: 'CryptoComparePrice',
                    params: {
                      fsym: 'ETH',
                      tsyms: 'USD',
                      limit: 24,
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
          expect(result[0][0].label).to.equal('TEST');
        });

        it('responds with a leaf with the mean value', () => {
          expect(LeafValueCoder.decode(result[0][0].valueBytes, result[0][0].label)).is.a('number').that.equal(95.5);
        });
      });

      describe('when processing multi feeds', () => {
        beforeEach(() => {
          calculatorRepository.find.withArgs('Identity').returns(new IdentityCalculator());
        });

        const feeds: Feeds = {
          'UMB-USD': feedFactory.build({
            inputs: [
              feedInputFactory.build({
                fetcher: {
                  name: 'CoingeckoPrice',
                  params: {
                    id: 'umbrella-network',
                    currency: 'USD',
                  },
                },
              }),
              feedInputFactory.build({
                fetcher: {
                  name: 'CryptoComparePrice',
                  params: {
                    fsym: 'UMB',
                    tsyms: 'USD',
                  },
                },
              }),
            ],
          }),
          'UMB-BTC': feedFactory.build({
            inputs: [
              feedInputFactory.build({
                fetcher: {
                  name: 'CoingeckoPrice',
                  params: {
                    id: 'umbrella-network',
                    currency: 'BTC',
                  },
                },
              }),
              feedInputFactory.build({
                fetcher: {
                  name: 'CryptoComparePrice',
                  params: {
                    fsym: 'UMB',
                    tsyms: 'BTC',
                  },
                },
              }),
            ],
          }),
        };

        describe('and all processors resolve', () => {
          beforeEach(() => {
            coingeckoMultiProcessor.apply.resolves([0, undefined, 2, undefined]);
            cryptoCompareMultiProcessor.apply.resolves([undefined, 1, undefined, 3]);
          });

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
          beforeEach(() => {
            coingeckoMultiProcessor.apply.rejects();
            cryptoCompareMultiProcessor.apply.resolves([undefined, 1, undefined, 3]);
          });

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
          beforeEach(() => {
            coingeckoMultiProcessor.apply.rejects();
            cryptoCompareMultiProcessor.apply.rejects();
          });

          it('returns what exactly', async () => {
            const result = await instance.apply(10, feeds);

            expect(result).to.deep.equal([[]]);
          });
        });
      });

      describe('when fetcher is CryptoComparePrice', () => {
        before(async () => {
          calculatorRepository.find.withArgs('Identity').returns(new IdentityCalculator());
          cryptoCompareMultiProcessor.apply.resolves([100]);

          const feeds: Feeds = {
            TEST: feedFactory.build({
              inputs: [
                feedInputFactory.build({
                  fetcher: {
                    name: 'CryptoComparePrice',
                    params: {
                      fsym: 'ETH',
                      tsyms: 'USD',
                      limit: 24,
                    },
                  },
                }),
              ],
            }),
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
    });

    describe('when two feeds are given', () => {
      describe('when both fetchers do not exist', () => {
        before(async () => {
          feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);
          calculatorRepository.find.withArgs('Identity').returns(new IdentityCalculator());

          const feeds1: Feeds = {
            TEST: feedFactory.build({inputs: [feedInputFactory.build({fetcher: {name: 'WrongFetcher'}})]}),
          };

          const feeds2: Feeds = {
            TEST: feedFactory.build({inputs: [feedInputFactory.build({fetcher: {name: 'WrongFetcher'}})]}),
          };

          testFetcher.apply = stub().resolves(100.0);

          result = await instance.apply(10, feeds1, feeds2);
        });

        it('responds with an empty multidimensional array', () => {
          expect(result).to.deep.equal([[], []]);
        });

        it('does not call identityCalculator.apply', () => {
          expect(identityCalculator.apply.called).to.be.false;
        });
      });

      describe('when one fetcher does not exist', () => {
        before(async () => {
          feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);
          calculatorRepository.find.withArgs('Identity').returns(new IdentityCalculator());

          const feeds1: Feeds = {
            TEST: feedFactory.build(),
          };

          const feeds2: Feeds = {
            TEST: feedFactory.build({inputs: [feedInputFactory.build({fetcher: {name: 'WrongFetcher'}})]}),
          };

          testFetcher.apply = stub().resolves(100.0);

          result = await instance.apply(10, feeds1, feeds2);
        });

        it('responds with an array that include an array with result and an empty array', () => {
          expect(result[0]).to.be.an('array').with.lengthOf(1);
          expect(result[1]).to.be.an('array').with.lengthOf(0);
          expect(result[0][0].label).to.equal('TEST');
        });

        it('responds with a leaf with value decoded as number', () => {
          expect(LeafValueCoder.decode(result[0][0].valueBytes, result[0][0].label)).is.a('number').that.equal(100.0);
        });
      });

      describe('when both fetchers exist', () => {
        before(async () => {
          feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);
          calculatorRepository.find.withArgs('Identity').returns(new IdentityCalculator());

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
});
