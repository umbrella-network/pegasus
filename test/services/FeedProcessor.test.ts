/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {Container} from 'inversify';
import sinon from 'sinon';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {LeafValueCoder} from '@umb-network/toolbox';
import Feeds from '@umb-network/toolbox/dist/types/Feed';

import {mockedLogger} from '../mocks/logger';
import FeedProcessor from '../../src/services/FeedProcessor';
import Settings from '../../src/types/Settings';
import {expect} from 'chai';
import * as fetchers from '../../src/services/fetchers';

chai.use(chaiAsPromised);

describe('FeedProcessor', () => {
  let settings: Settings;

  const mockedFetchers = {
    CryptoCompareHistoHourFetcher:
      null as unknown as sinon.SinonStubbedInstance<fetchers.CryptoCompareHistoHourFetcher>,
    CryptoCompareHistoDayFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.CryptoCompareHistoDayFetcher>,
    CryptoComparePriceMultiFetcher:
      null as unknown as sinon.SinonStubbedInstance<fetchers.CryptoComparePriceMultiFetcher>,
    GVolImpliedVolatilityFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.GVolImpliedVolatilityFetcher>,
    PolygonIOCryptoPriceFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.PolygonIOCryptoPriceFetcher>,
    PolygonIOStockPriceFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.PolygonIOStockPriceFetcher>,
    CryptoComparePriceWSFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.CryptoComparePriceWSFetcher>,
    IEXEnergyFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.IEXEnergyFetcher>,
    CoingeckoPriceFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.CoingeckoPriceFetcher>,
    CoinmarketcapPriceFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.CoinmarketcapPriceFetcher>,
    BEACPIAverageFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.BEACPIAverageFetcher>,
    OnChainDataFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.OnChainDataFetcher>,
  };

  let feedProcessor: FeedProcessor;

  beforeEach(async () => {
    mockedFetchers.CryptoCompareHistoHourFetcher = sinon.createStubInstance(fetchers.CryptoCompareHistoHourFetcher);
    mockedFetchers.CryptoCompareHistoDayFetcher = sinon.createStubInstance(fetchers.CryptoCompareHistoDayFetcher);
    mockedFetchers.CryptoComparePriceMultiFetcher = sinon.createStubInstance(fetchers.CryptoComparePriceMultiFetcher);
    mockedFetchers.GVolImpliedVolatilityFetcher = sinon.createStubInstance(fetchers.GVolImpliedVolatilityFetcher);
    mockedFetchers.PolygonIOCryptoPriceFetcher = sinon.createStubInstance(fetchers.PolygonIOCryptoPriceFetcher);
    mockedFetchers.PolygonIOCryptoPriceFetcher = sinon.createStubInstance(fetchers.PolygonIOCryptoPriceFetcher);
    mockedFetchers.CryptoComparePriceWSFetcher = sinon.createStubInstance(fetchers.CryptoComparePriceWSFetcher);
    mockedFetchers.IEXEnergyFetcher = sinon.createStubInstance(fetchers.IEXEnergyFetcher);
    mockedFetchers.CoingeckoPriceFetcher = sinon.createStubInstance(fetchers.CoingeckoPriceFetcher);
    mockedFetchers.CoinmarketcapPriceFetcher = sinon.createStubInstance(fetchers.CoinmarketcapPriceFetcher);
    mockedFetchers.BEACPIAverageFetcher = sinon.createStubInstance(fetchers.BEACPIAverageFetcher);
    mockedFetchers.OnChainDataFetcher = sinon.createStubInstance(fetchers.OnChainDataFetcher);

    const container = new Container();

    settings = {
      feedsFile: 'test/feeds/feeds.yaml',
      feedsOnChain: 'test/feeds/feedsOnChain.yaml',
    } as Settings;

    container.bind('Logger').toConstantValue(mockedLogger);
    container.bind('Settings').toConstantValue(settings);

    container
      .bind(fetchers.CryptoCompareHistoHourFetcher)
      .toConstantValue(mockedFetchers.CryptoCompareHistoHourFetcher as any);
    container
      .bind(fetchers.CryptoCompareHistoDayFetcher)
      .toConstantValue(mockedFetchers.CryptoCompareHistoDayFetcher as any);
    container
      .bind(fetchers.CryptoComparePriceMultiFetcher)
      .toConstantValue(mockedFetchers.CryptoComparePriceMultiFetcher as any);
    container
      .bind(fetchers.GVolImpliedVolatilityFetcher)
      .toConstantValue(mockedFetchers.GVolImpliedVolatilityFetcher as any);
    container
      .bind(fetchers.PolygonIOCryptoPriceFetcher)
      .toConstantValue(mockedFetchers.PolygonIOCryptoPriceFetcher as any);
    container
      .bind(fetchers.PolygonIOStockPriceFetcher)
      .toConstantValue(mockedFetchers.PolygonIOStockPriceFetcher as any);
    container
      .bind(fetchers.CryptoComparePriceWSFetcher)
      .toConstantValue(mockedFetchers.CryptoComparePriceWSFetcher as any);
    container.bind(fetchers.IEXEnergyFetcher).toConstantValue(mockedFetchers.IEXEnergyFetcher as any);
    container.bind(fetchers.CoinmarketcapPriceFetcher).toConstantValue(mockedFetchers.CoinmarketcapPriceFetcher as any);
    container.bind(fetchers.CoingeckoPriceFetcher).toConstantValue(mockedFetchers.CoingeckoPriceFetcher as any);
    container.bind(fetchers.BEACPIAverageFetcher).toConstantValue(mockedFetchers.BEACPIAverageFetcher as any);
    container.bind(fetchers.OnChainDataFetcher).toConstantValue(mockedFetchers.OnChainDataFetcher as any);

    container.bind(FeedProcessor).toSelf();

    feedProcessor = container.get(FeedProcessor);
  });

  it('returns leafs for feeds with CryptoCompareHistoHour fetcher', async () => {
    const feeds: Feeds = {
      'ETH-USD-TWAP-1day': {
        discrepancy: 0.1,
        precision: 2,
        inputs: [
          {
            fetcher: {
              name: 'CryptoCompareHistoHour',
              params: {
                fsym: 'ETH',
                tsym: 'USD',
                limit: 24,
              } as any,
            },
            calculator: {
              name: 'TWAP',
            },
          },
        ],
      },
    };

    mockedFetchers.CryptoCompareHistoHourFetcher.apply.resolves([
      [{high: 1380.16, low: 1367.16, open: 1377.43, close: 1372.9}, 16798.85],
      [{high: 1358.45, low: 1351.08, open: 1352.75, close: 1355.31}, 15647.4],
      [{high: 1376.11, low: 1359.79, open: 1355.68, close: 1360.47}, 35425.3],
      [{high: 1352.2, low: 1347.14, open: 1360.47, close: 1349.5}, 22545.38],
    ]);

    const leaves = await feedProcessor.apply(10, feeds);

    expect(leaves[0]).to.be.an('array').with.lengthOf(1);
    expect(leaves[0][0].valueBytes)
      .is.a('string')
      .that.matches(/^0x[a-fA-F0-9]+$/);
  });

  it('returns leafs for feeds with CryptoCompareHistoDay fetcher', async () => {
    const feeds: Feeds = {
      'ETH-USD-TWAP-30days': {
        discrepancy: 0.1,
        precision: 2,
        inputs: [
          {
            fetcher: {
              name: 'CryptoCompareHistoDay',
              params: {
                fsym: 'ETH',
                tsym: 'USD',
                limit: 30,
              } as any,
            },
            calculator: {
              name: 'TWAP',
            },
          },
          {
            fetcher: {
              name: 'CryptoComparePriceWS',
              params: {
                fsym: 'ETH',
                tsym: 'USD',
                limit: 30,
              } as any,
            },
          },
        ],
      },
      'ETH-USD-VWAP-10days': {
        discrepancy: 0.1,
        precision: 2,
        inputs: [
          {
            fetcher: {
              name: 'CryptoCompareHistoHour',
              params: {
                fsym: 'ETH',
                tsym: 'USD',
                limit: 30,
              } as any,
            },
            calculator: {
              name: 'VWAP',
            },
          },
          {
            fetcher: {
              name: 'CryptoComparePriceWS',
              params: {
                fsym: 'ETH',
                tsym: 'USD',
                limit: 30,
              } as any,
            },
          },
          {
            fetcher: {
              name: 'CoingeckoPrice',
              params: {} as any,
            },
          },
        ],
      },
    };

    mockedFetchers.CryptoCompareHistoDayFetcher.apply.resolves([
      [{high: 749.71, low: 717.14, open: 737.15, close: 730.6}, 236164.48],
      [{high: 788.27, low: 716.71, open: 730.6, close: 774.9}, 4953.39],
      [{high: 1011.81, low: 770.07, open: 774.9, close: 978.69}, 2200163.67],
      [{high: 1290.46, low: 1151.6, open: 1210.59, close: 1225.5}, 2601329.3],
    ]);

    mockedFetchers.CryptoCompareHistoHourFetcher.apply.resolves([
      [{high: 749.71, low: 717.14, open: 737.15, close: 730.6}, 426164.48],
      [{high: 788.27, low: 716.71, open: 730.6, close: 774.9}, 914953.39],
      [{high: 1011.81, low: 770.07, open: 774.9, close: 978.69}, 8100163.67],
      [{high: 1290.46, low: 1151.6, open: 1210.59, close: 1225.5}, 2101329.3],
    ]);

    mockedFetchers.CryptoComparePriceWSFetcher.apply.resolves(954.23);
    mockedFetchers.CoingeckoPriceFetcher.apply.resolves(955.11);

    const leaves = await feedProcessor.apply(10, feeds);

    expect(leaves[0]).to.be.an('array').with.lengthOf(2);

    expect(leaves[0][0].label).to.equal('ETH-USD-TWAP-30days');
    expect(LeafValueCoder.decode(leaves[0][0].valueBytes, leaves[0][0].label)).is.a('number').that.equal(925.82);
    expect(leaves[0][1].label).to.equal('ETH-USD-VWAP-10days');
    expect(LeafValueCoder.decode(leaves[0][1].valueBytes, leaves[0][1].label)).is.a('number').that.equal(954.98);
  });
});
