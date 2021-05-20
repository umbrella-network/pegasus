/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {Container} from 'inversify';
import sinon from 'sinon';
import {mockedLogger} from '../mocks/logger';
import FeedProcessor from '../../src/services/FeedProcessor';
import Settings from '../../src/types/Settings';
import {expect} from 'chai';
import * as fetchers from '../../src/services/fetchers';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import Feeds from '../../src/types/Feed';
chai.use(chaiAsPromised);

describe('FeedProcessor', () => {
  let settings: Settings;

  const mockedFetchers = {
    CryptoCompareHistoHourFetcher: (null as unknown) as sinon.SinonStubbedInstance<fetchers.CryptoCompareHistoHourFetcher>,
    CryptoCompareHistoDayFetcher: (null as unknown) as sinon.SinonStubbedInstance<fetchers.CryptoCompareHistoDayFetcher>,
    CryptoComparePriceFetcher: (null as unknown) as sinon.SinonStubbedInstance<fetchers.CryptoComparePriceFetcher>,
    GVolImpliedVolatilityFetcher: (null as unknown) as sinon.SinonStubbedInstance<fetchers.GVolImpliedVolatilityFetcher>,
    PolygonIOPriceFetcher: (null as unknown) as sinon.SinonStubbedInstance<fetchers.PolygonIOPriceFetcher>,
    CryptoComparePriceWSFetcher: (null as unknown) as sinon.SinonStubbedInstance<fetchers.CryptoComparePriceWSFetcher>,
    IEXEnergyFetcher: (null as unknown) as sinon.SinonStubbedInstance<fetchers.IEXEnergyFetcher>,
    CoingeckoPriceFetcher: (null as unknown) as sinon.SinonStubbedInstance<fetchers.CoingeckoPriceFetcher>,
    CoinmarketcapPriceFetcher: (null as unknown) as sinon.SinonStubbedInstance<fetchers.CoinmarketcapPriceFetcher>,
    BEACPIAverageFetcher: (null as unknown) as sinon.SinonStubbedInstance<fetchers.BEACPIAverageFetcher>,
  };

  let feedProcessor: FeedProcessor;

  beforeEach(async () => {
    mockedFetchers.CryptoCompareHistoHourFetcher = sinon.createStubInstance(fetchers.CryptoCompareHistoHourFetcher);
    mockedFetchers.CryptoCompareHistoDayFetcher = sinon.createStubInstance(fetchers.CryptoCompareHistoDayFetcher);
    mockedFetchers.CryptoComparePriceFetcher = sinon.createStubInstance(fetchers.CryptoComparePriceFetcher);
    mockedFetchers.GVolImpliedVolatilityFetcher = sinon.createStubInstance(fetchers.GVolImpliedVolatilityFetcher);
    mockedFetchers.PolygonIOPriceFetcher = sinon.createStubInstance(fetchers.PolygonIOPriceFetcher);
    mockedFetchers.CryptoComparePriceWSFetcher = sinon.createStubInstance(fetchers.CryptoComparePriceWSFetcher);
    mockedFetchers.IEXEnergyFetcher = sinon.createStubInstance(fetchers.IEXEnergyFetcher);
    mockedFetchers.CoingeckoPriceFetcher = sinon.createStubInstance(fetchers.CoingeckoPriceFetcher);
    mockedFetchers.CoinmarketcapPriceFetcher = sinon.createStubInstance(fetchers.CoinmarketcapPriceFetcher);
    mockedFetchers.BEACPIAverageFetcher = sinon.createStubInstance(fetchers.BEACPIAverageFetcher);

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
    container.bind(fetchers.CryptoComparePriceFetcher).toConstantValue(mockedFetchers.CryptoComparePriceFetcher as any);
    container
      .bind(fetchers.GVolImpliedVolatilityFetcher)
      .toConstantValue(mockedFetchers.GVolImpliedVolatilityFetcher as any);
    container.bind(fetchers.PolygonIOPriceFetcher).toConstantValue(mockedFetchers.PolygonIOPriceFetcher as any);
    container
      .bind(fetchers.CryptoComparePriceWSFetcher)
      .toConstantValue(mockedFetchers.CryptoComparePriceWSFetcher as any);
    container.bind(fetchers.IEXEnergyFetcher).toConstantValue(mockedFetchers.IEXEnergyFetcher as any);
    container.bind(fetchers.CoinmarketcapPriceFetcher).toConstantValue(mockedFetchers.CoinmarketcapPriceFetcher as any);
    container.bind(fetchers.CoingeckoPriceFetcher).toConstantValue(mockedFetchers.CoingeckoPriceFetcher as any);
    container.bind(fetchers.BEACPIAverageFetcher).toConstantValue(mockedFetchers.BEACPIAverageFetcher as any);

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
        ],
      },
      'ETH-USD-TWAP-10days': {
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
        ],
      },
    };

    mockedFetchers.CryptoCompareHistoDayFetcher.apply.resolves([
      [{high: 749.71, low: 717.14, open: 737.15, close: 730.6}, 436164.48],
      [{high: 788.27, low: 716.71, open: 730.6, close: 774.9}, 904953.39],
      [{high: 1011.81, low: 770.07, open: 774.9, close: 978.69}, 2200163.67],
      [{high: 1290.46, low: 1151.6, open: 1210.59, close: 1225.5}, 1601329.3],
    ]);

    const leaves = await feedProcessor.apply(10, feeds);

    expect(leaves[0]).to.be.an('array').with.lengthOf(2);

    expect(leaves[0][0].label).to.equal('ETH-USD-TWAP-30days');
    expect(leaves[0][0].valueBytes)
      .is.a('string')
      .that.matches(/^0x[a-fA-F0-9]+$/);
    expect(leaves[0][1].label).to.equal('ETH-USD-TWAP-10days');
    expect(leaves[0][1].valueBytes)
      .is.a('string')
      .that.matches(/^0x[a-fA-F0-9]+$/);
  });
});
