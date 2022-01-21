/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {Container} from 'inversify';
import sinon from 'sinon';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import {LeafValueCoder} from '@umb-network/toolbox';

import Feeds from '../../src/types/Feed';
import {mockedLogger} from '../mocks/logger';
import FeedProcessor from '../../src/services/FeedProcessor';
import Settings from '../../src/types/Settings';
import {expect} from 'chai';
import * as fetchers from '../../src/services/fetchers';
import * as calculators from '../../src/services/calculators';

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
    CoinmarketcapHistoHourFetcher:
      null as unknown as sinon.SinonStubbedInstance<fetchers.CoinmarketcapHistoHourFetcher>,
    CoinmarketcapHistoDayFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.CoinmarketcapHistoDayFetcher>,
    BEACPIAverageFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.BEACPIAverageFetcher>,
    OnChainDataFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.OnChainDataFetcher>,
    KaikoPriceStreamFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.KaikoPriceStreamFetcher>,
    OptionsPriceFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.OptionsPriceFetcher>,
    YearnVaultTokenPriceFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.YearnVaultTokenPriceFetcher>,
    RandomNumberFetcher: null as unknown as sinon.SinonStubbedInstance<fetchers.RandomNumberFetcher>,
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
    mockedFetchers.CoinmarketcapHistoHourFetcher = sinon.createStubInstance(fetchers.CoinmarketcapHistoHourFetcher);
    mockedFetchers.CoinmarketcapHistoDayFetcher = sinon.createStubInstance(fetchers.CoinmarketcapHistoDayFetcher);
    mockedFetchers.RandomNumberFetcher = sinon.createStubInstance(fetchers.RandomNumberFetcher);
    mockedFetchers.BEACPIAverageFetcher = sinon.createStubInstance(fetchers.BEACPIAverageFetcher);
    mockedFetchers.OnChainDataFetcher = sinon.createStubInstance(fetchers.OnChainDataFetcher);
    mockedFetchers.KaikoPriceStreamFetcher = sinon.createStubInstance(fetchers.KaikoPriceStreamFetcher);
    mockedFetchers.YearnVaultTokenPriceFetcher = sinon.createStubInstance(fetchers.YearnVaultTokenPriceFetcher);
    mockedFetchers.OptionsPriceFetcher = sinon.createStubInstance(fetchers.OptionsPriceFetcher);

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
    container.bind(fetchers.RandomNumberFetcher).toConstantValue(mockedFetchers.RandomNumberFetcher as any);
    container
      .bind(fetchers.CryptoComparePriceWSFetcher)
      .toConstantValue(mockedFetchers.CryptoComparePriceWSFetcher as any);
    container.bind(fetchers.IEXEnergyFetcher).toConstantValue(mockedFetchers.IEXEnergyFetcher as any);
    container.bind(fetchers.CoinmarketcapPriceFetcher).toConstantValue(mockedFetchers.CoinmarketcapPriceFetcher as any);
    container
      .bind(fetchers.CoinmarketcapHistoHourFetcher)
      .toConstantValue(mockedFetchers.CoinmarketcapHistoHourFetcher as any);
    container
      .bind(fetchers.CoinmarketcapHistoDayFetcher)
      .toConstantValue(mockedFetchers.CoinmarketcapHistoDayFetcher as any);
    container.bind(fetchers.CoingeckoPriceFetcher).toConstantValue(mockedFetchers.CoingeckoPriceFetcher as any);
    container.bind(fetchers.BEACPIAverageFetcher).toConstantValue(mockedFetchers.BEACPIAverageFetcher as any);
    container.bind(fetchers.OnChainDataFetcher).toConstantValue(mockedFetchers.OnChainDataFetcher as any);
    container.bind(fetchers.KaikoPriceStreamFetcher).toConstantValue(mockedFetchers.KaikoPriceStreamFetcher as any);
    container
      .bind(fetchers.YearnVaultTokenPriceFetcher)
      .toConstantValue(mockedFetchers.YearnVaultTokenPriceFetcher as any);
    container.bind(fetchers.OptionsPriceFetcher).toConstantValue(mockedFetchers.OptionsPriceFetcher as any);

    container.bind(calculators.TWAPCalculator).toSelf();
    container.bind(calculators.VWAPCalculator).toSelf();
    container.bind(calculators.YearnTransformPriceCalculator).toSelf();
    container.bind(calculators.OptionsPriceCalculator).toSelf();
    container.bind(calculators.IdentityCalculator).toSelf();

    container.bind(FeedProcessor).toSelf();

    feedProcessor = container.get(FeedProcessor);
  });

  afterEach(() => {
    sinon.restore();
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

  it('returns leafs for feeds with CoinmarketcapHistoHourFetcher fetcher', async () => {
    const feeds: Feeds = {
      'DAFI-USD-TWAP-1day': {
        discrepancy: 1,
        precision: 2,
        inputs: [
          {
            fetcher: {
              name: 'CoinmarketcapHistoHour',
              params: {
                symbol: 'DAFI',
                convert: 'USD',
                count: 24,
              } as any,
            },
            calculator: {
              name: 'TWAP',
            },
          },
        ],
      },
    };

    mockedFetchers.CoinmarketcapHistoHourFetcher.apply.resolves([
      [{high: 0.01921101420515, low: 0.01877340354233, open: 0.01920044307503, close: 0.01883937761903}, 0],
      [{high: 0.01892011699539, low: 0.01865968395006, open: 0.01883342952984, close: 0.01871888037923}, 0],
      [{high: 0.019151325829, low: 0.01868707355498, open: 0.01873161524546, close: 0.01881365248309}, 0],
      [{high: 0.01928533157671, low: 0.01881243016939, open: 0.01881243016939, close: 0.01928533157671}, 0],
    ]);

    const leaves = await feedProcessor.apply(10, feeds);

    expect(leaves[0]).to.be.an('array').with.lengthOf(1);

    expect(leaves[0][0].label).to.equal('DAFI-USD-TWAP-1day');
    expect(LeafValueCoder.decode(leaves[0][0].valueBytes, leaves[0][0].label)).is.a('number').that.equal(0.02);
  });

  it('returns leafs for feeds with CoinmarketcapHistoDayFetcher fetcher', async () => {
    const feeds: Feeds = {
      'DAFI-USD-VWAP-2day': {
        discrepancy: 1,
        precision: 2,
        inputs: [
          {
            fetcher: {
              name: 'CoinmarketcapHistoDay',
              params: {
                symbol: 'DAFI',
                convert: 'USD',
                count: 2,
              } as any,
            },
            calculator: {
              name: 'VWAP',
            },
          },
        ],
      },
    };

    mockedFetchers.CoinmarketcapHistoDayFetcher.apply.resolves([
      [{high: 0.01982096, low: 0.01817868, open: 0.01920489, close: 0.01919132}, 153270.54],
      [{high: 0.02047754, low: 0.01865968, open: 0.01920292, close: 0.02026433}, 212662.98],
    ]);

    const leaves = await feedProcessor.apply(10, feeds);

    expect(leaves[0]).to.be.an('array').with.lengthOf(1);

    expect(leaves[0][0].label).to.equal('DAFI-USD-VWAP-2day');
    expect(LeafValueCoder.decode(leaves[0][0].valueBytes, leaves[0][0].label)).is.a('number').that.equal(0.02);
  });

  it('should log and not throw when fetcher is not found', async () => {
    const someFetcherName = 'ThisFetcherDoesNotExist';
    const feeds: Feeds = {
      'BTC-USD': {
        discrepancy: 0.1,
        precision: 2,
        inputs: [
          {
            fetcher: {
              name: someFetcherName,
              params: {
                fsym: 'BTC',
                tsym: 'USD',
              } as any,
            },
          },
        ],
      },
    };

    const loggerSpy = sinon.spy(mockedLogger, 'warn');

    try {
      await feedProcessor.apply(10, feeds);
      expect(loggerSpy.calledWithExactly(sinon.match(`No fetcher specified for ${someFetcherName}`))).to.be.true;
    } catch (err) {
      expect(err).to.be.false;
    }
  });

  it('returns leafs for feeds with KaikoPriceStreamFetcher fetcher', async () => {
    const feeds: Feeds = {
      'BTC-USD': {
        discrepancy: 1,
        precision: 2,
        inputs: [
          {
            fetcher: {
              name: 'KaikoPriceStream',
              params: {
                fsym: 'BTC',
                tsym: 'USD',
              } as any,
            },
          },
        ],
      },
    };

    mockedFetchers.KaikoPriceStreamFetcher.apply.resolves(38123);

    const leaves = await feedProcessor.apply(10, feeds);

    expect(leaves[0]).to.be.an('array').with.lengthOf(1);

    expect(leaves[0][0].label).to.equal('BTC-USD');
    expect(LeafValueCoder.decode(leaves[0][0].valueBytes, leaves[0][0].label)).is.a('number').that.equal(38123);
  });

  describe('Options feeds', () => {
    beforeEach(() => {
      mockedFetchers.OptionsPriceFetcher.apply.resolves({
        'ETH-28OCT21-4250': {
          callPrice: 0.016044137806534572,
          iv: 69.63163673462594,
          putPrice: 0.027246912546743607,
        },
        'BTC-05NOV21-66000': {
          callPrice: 0.029274057826769995,
          iv: 75.67446534167162,
          putPrice: 0.08303273994157734,
        },
      });
    });

    it('should not return Options Price Fetchers when OPTIONS feed is not present', async () => {
      const feeds: Feeds = {
        'BTC-USD': {
          discrepancy: 1,
          precision: 2,
          inputs: [
            {
              fetcher: {
                name: 'KaikoPriceStream',
                params: {
                  fsym: 'BTC',
                  tsym: 'USD',
                } as any,
              },
            },
          ],
        },
      };

      mockedFetchers.KaikoPriceStreamFetcher.apply.resolves(38123);

      const [firstClassLeaves, layerTwoLeaves] = await feedProcessor.apply(10, feeds, feeds);

      const expected = [
        {
          label: 'BTC-USD',
          valueBytes: '0x000000000000000000000000000000000000000000000812a6e793b078cc0000',
        },
      ];

      expect(firstClassLeaves).to.eql(expected);
      expect(layerTwoLeaves).to.eql(expected);
    });

    it('should return options with proper prefix', async () => {
      const feeds: Feeds = {
        'OP:ETH-*': {
          discrepancy: 1,
          precision: 15,
          inputs: [
            {
              fetcher: {
                name: 'OptionsPrice',
              },
              calculator: {
                name: 'OptionsPrice',
                params: {
                  sym: 'ETH',
                },
              },
            },
          ],
        },
      };

      const [result] = await feedProcessor.apply(10, feeds);

      expect(result).to.eql([
        {
          label: 'OP:ETH-28OCT21-4250_call_price',
          valueBytes: '0x0000000000000000000000000000000000000000000000000039000eeeaf9958',
        },
        {
          label: 'OP:ETH-28OCT21-4250_iv_price',
          valueBytes: '0x000000000000000000000000000000000000000000000003c65544af986b8220',
        },
        {
          label: 'OP:ETH-28OCT21-4250_put_price',
          valueBytes: '0x0000000000000000000000000000000000000000000000000060ccec2f9326c0',
        },
      ]);
    });

    it('should return both ETH and BTC with proper feeds config', async () => {
      const feeds: Feeds = {
        'OP:BTC-*': {
          discrepancy: 1,
          precision: 15,
          inputs: [
            {
              fetcher: {
                name: 'OptionsPrice',
              },
              calculator: {
                name: 'OptionsPrice',
                params: {
                  sym: 'BTC',
                },
              },
            },
          ],
        },
        'OP:ETH-*': {
          discrepancy: 1,
          precision: 15,
          inputs: [
            {
              fetcher: {
                name: 'OptionsPrice',
              },
              calculator: {
                name: 'OptionsPrice',
                params: {
                  sym: 'ETH',
                },
              },
            },
          ],
        },
      };

      const [result] = await feedProcessor.apply(10, feeds);

      expect(result).to.eql([
        {
          label: 'OP:BTC-05NOV21-66000_call_price',
          valueBytes: '0x00000000000000000000000000000000000000000000000000680099b9e61c50',
        },
        {
          label: 'OP:BTC-05NOV21-66000_iv_price',
          valueBytes: '0x0000000000000000000000000000000000000000000000041a31b549a9f23da0',
        },
        {
          label: 'OP:BTC-05NOV21-66000_put_price',
          valueBytes: '0x0000000000000000000000000000000000000000000000000126fdd648f1f128',
        },
        {
          label: 'OP:ETH-28OCT21-4250_call_price',
          valueBytes: '0x0000000000000000000000000000000000000000000000000039000eeeaf9958',
        },
        {
          label: 'OP:ETH-28OCT21-4250_iv_price',
          valueBytes: '0x000000000000000000000000000000000000000000000003c65544af986b8220',
        },
        {
          label: 'OP:ETH-28OCT21-4250_put_price',
          valueBytes: '0x0000000000000000000000000000000000000000000000000060ccec2f9326c0',
        },
      ]);
    });
  });
});
