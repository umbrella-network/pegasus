import 'reflect-metadata';
import {Container} from 'inversify';
import sinon, {createStubInstance, SinonStubbedInstance, stub} from 'sinon';
import {expect} from 'chai';
import Feeds from '@umb-network/toolbox/dist/types/Feed';

import {getTestContainer} from '../helpers/getTestContainer';
import {FeedFetcherRepository, FeedFetcher} from '../../src/repositories/FeedFetcherRepository';
import {CalculatorRepository} from '../../src/repositories/CalculatorRepository';
import FeedDataProcessor from '../../src/services/FeedDataProcessor';
import {IdentityCalculator} from '../../src/services/calculators';
import {feedFactory, feedInputFactory} from '../mocks/factories/feedFactory';

import CryptoCompareMultiProcessor from '../../src/services/FeedProcessor/CryptoCompareMultiProcessor';
import CoingeckoMultiProcessor from '../../src/services/FeedProcessor/CoingeckoMultiProcessor';
import {FeedDatum} from '../../src/types/Datum';
import {FeedPrice} from '../../src/types/Feed';

const emptyFeedData = {data: [], prices: []};
const timestamp = Math.floor(Date.now() / 1000);

describe('FeedDataProcessor', () => {
  let instance: FeedDataProcessor;
  let container: Container;
  let testFetcher: FeedFetcher;
  let result: {data: FeedDatum[]; prices: FeedPrice[]};
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

    instance = container.get(FeedDataProcessor);
  });

  afterEach(() => {
    sinon.reset();
  });

  describe('.apply', () => {
    describe('when feeds is empty', () => {
      before(async () => {
        result = await instance.apply(timestamp, {});
      });

      it('responds with an object that contain empty data and empty price', () => {
        expect(result).to.deep.equal(emptyFeedData);
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

        result = await instance.apply(timestamp, feeds);
      });

      it('responds with an object that contain empty data and empty price', () => {
        expect(result).to.deep.equal(emptyFeedData);
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

        result = await instance.apply(timestamp, feeds);
      });

      it('responds with an object that contain empty data and empty price', () => {
        expect(result).to.deep.equal(emptyFeedData);
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

          result = await instance.apply(timestamp, feeds);
        });

        it('responds with an object that contain an empty prices array', () => {
          expect(result.prices).to.be.an('array').with.lengthOf(0);
        });

        it('responds with an object that contain data array with 1 length', () => {
          expect(result.data).to.be.an('array').with.lengthOf(1);
        });

        it('responds with an object that contain the correct symbol', () => {
          expect(result.data[0].symbol).to.equal('FIXED_TEST');
        });

        it('responds with an object that contain the correct data value', () => {
          expect(result.data[0].value).is.a('string').that.equal('100');
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

          result = await instance.apply(timestamp, feeds);
        });

        it('responds with an object that contain an empty data array', () => {
          expect(result.data).to.be.an('array').with.lengthOf(0);
        });

        it('responds with an object that contain prices array with 1 length', () => {
          expect(result.prices).to.be.an('array').with.lengthOf(1);
        });

        it('responds with an object that contain the correct symbol', () => {
          expect(result.prices[0].symbol).to.equal('TEST');
        });

        it('responds with an objectthat contains the correct value', () => {
          expect(result.prices[0].value).is.a('number').that.equal(100.0);
        });
      });

      describe('when feeds have more inputs for the same feed', () => {
        before(async () => {
          feedFetcherRepository.find.withArgs('TestFetcher').returns(testFetcher);
          cryptoCompareMultiProcessor.apply.resolves([100.7]);
          testFetcher.apply = stub().resolves(90.3);
          calculatorRepository.find.withArgs('Identity').returns(new IdentityCalculator());

          const feeds: Feeds = {
            'ETH-USD': feedFactory.build({
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

          result = await instance.apply(timestamp, feeds);
        });

        it('responds with an object that contain an empty data array', () => {
          expect(result.data).to.be.an('array').with.lengthOf(0);
        });

        it('responds with an object that contain two prices', () => {
          expect(result.prices).to.deep.equal([
            {
              symbol: 'ETH-USD',
              source: 'TestFetcher',
              value: 90.3,
              timestamp: new Date(timestamp * 1000),
            },
            {
              symbol: 'ETH-USD',
              source: 'CryptoComparePrice',
              value: 100.7,
              timestamp: new Date(timestamp * 1000),
            },
          ]);
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

          it('responds with and object that contain prices and empty data', async () => {
            const result = await instance.apply(timestamp, feeds);
            const resultExpected = {
              data: [],
              prices: [
                {
                  source: 'CryptoComparePrice',
                  symbol: 'UMB-USD',
                  value: 1,
                  timestamp: new Date(timestamp * 1000),
                },
                {
                  source: 'CoingeckoPrice',
                  symbol: 'UMB-BTC',
                  value: 2,
                  timestamp: new Date(timestamp * 1000),
                },
                {
                  source: 'CryptoComparePrice',
                  symbol: 'UMB-BTC',
                  value: 3,
                  timestamp: new Date(timestamp * 1000),
                },
              ],
            };

            expect(result).to.deep.equal(resultExpected);
          });
        });

        describe('and one of the processors rejects', () => {
          beforeEach(() => {
            coingeckoMultiProcessor.apply.rejects();
            cryptoCompareMultiProcessor.apply.resolves([undefined, 1, undefined, 3]);
          });

          it('returns only the resolved leaves', async () => {
            const result = await instance.apply(timestamp, feeds);
            expect(result).to.deep.equal({
              data: [],
              prices: [
                {
                  source: 'CryptoComparePrice',
                  symbol: 'UMB-USD',
                  value: 1,
                  timestamp: new Date(timestamp * 1000),
                },
                {
                  source: 'CryptoComparePrice',
                  symbol: 'UMB-BTC',
                  value: 3,
                  timestamp: new Date(timestamp * 1000),
                },
              ],
            });
          });
        });

        describe('and all processors rejects', () => {
          beforeEach(() => {
            coingeckoMultiProcessor.apply.rejects();
            cryptoCompareMultiProcessor.apply.rejects();
          });

          it('returns what exactly', async () => {
            const result = await instance.apply(timestamp, feeds);
            expect(result).to.deep.equal(emptyFeedData);
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

          result = await instance.apply(timestamp, feeds);
        });

        it('responds with an object that contain an empty data array', () => {
          expect(result.data).to.be.an('array').with.lengthOf(0);
        });

        it('responds with an object that contain prices array with 1 length', () => {
          expect(result.prices).to.be.an('array').with.lengthOf(1);
        });

        it('responds with an object that contain the correct symbol', () => {
          expect(result.prices[0].symbol).to.equal('TEST');
        });

        it('responds with an objectthat contains the correct value', () => {
          expect(result.prices[0].value).is.a('number').that.equal(100.0);
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

          result = await instance.apply(timestamp, feeds1, feeds2);
        });

        it('responds with an object that contain empty data and empty price', () => {
          expect(result).to.deep.equal(emptyFeedData);
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

          result = await instance.apply(timestamp, feeds1, feeds2);
        });

        it('responds with an object that contain an empty data array', () => {
          expect(result.data).to.be.an('array').with.lengthOf(0);
        });

        it('responds with an object that contain prices array with 1 length', () => {
          expect(result.prices).to.be.an('array').with.lengthOf(1);
        });

        it('responds with an object that contain the correct symbol', () => {
          expect(result.prices[0].symbol).to.equal('TEST');
        });

        it('responds with an object that contain the correct data value', () => {
          expect(result.prices[0].value).is.a('number').that.equal(100.0);
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

          result = await instance.apply(timestamp, feeds1, feeds2);
        });

        it('responds with an object that contain an empty data array', () => {
          expect(result.data).to.be.an('array').with.lengthOf(0);
        });

        it('responds with an object that contain prices array ', () => {
          expect(result.prices).to.deep.equal([
            {source: 'TestFetcher', symbol: 'TEST', value: 100.0, timestamp: new Date(timestamp * 1000)},
            {source: 'TestFetcher', symbol: 'HAHN-USD', value: 100.0, timestamp: new Date(timestamp * 1000)},
          ]);
        });
      });
    });
  });
});
