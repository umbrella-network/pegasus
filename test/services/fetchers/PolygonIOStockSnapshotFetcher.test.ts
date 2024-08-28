import 'reflect-metadata';
import chai from 'chai';
import moxios from 'moxios';
import chaiAsPromised from 'chai-as-promised';

import Settings from '../../../src/types/Settings.js';
import {PolygonIOStockSnapshotPriceFetcher} from '../../../src/services/fetchers/PolygonIOStockSnapshotPriceFetcher.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';

chai.use(chaiAsPromised);

const {expect} = chai;

describe.skip('PolygonIOStockSnapshotFetcher', () => {
  let settings: Settings;
  let polygonIOStockSnapshotFetcher: PolygonIOStockSnapshotPriceFetcher;

  const ticker1 = {
    ticker: 'UVXY',
    lastTrade: {
      p: 10.1,
      t: 12,
    },
  };
  const ticker2 = {
    ticker: 'VIXY',
    lastTrade: {
      p: 20.02,
      t: 12,
    },
  };
  const responseExample1 = {
    tickers: [ticker1],
  };
  const responseExample2 = {
    tickers: [ticker2],
  };

  beforeEach(async () => {
    moxios.install();

    const container = getTestContainer();

    settings = {
      api: {
        polygonIO: {
          apiKey: 'POLYGON_IO_API_KEY',
          timeout: 5000,
          maxBatchSize: 1,
        },
      },
      blockchain: {
        multiChains: {},
      },
    } as Settings;

    container.rebind('Settings').toConstantValue(settings);

    container.bind(PolygonIOStockSnapshotPriceFetcher).toSelf();

    polygonIOStockSnapshotFetcher = container.get(PolygonIOStockSnapshotPriceFetcher);
  });

  afterEach(() => {
    moxios.uninstall();
  });

  describe('#apply', () => {
    describe('when one request is done', () => {
      it('responds with an array of ticker objects', async () => {
        const responseExample = {
          tickers: [ticker1],
        };

        moxios.stubRequest(
          'https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=POLYGON_IO_API_KEY',
          {
            status: 200,
            response: responseExample,
          },
        );

        const result = await polygonIOStockSnapshotFetcher.apply([{ticker: 'UVXY'}], {symbols: ['UVXY'], timestamp: 1});

        expect(result).to.eql({
          tickers: [ticker1],
        });
      });
    });

    describe('when performing multiple requests', () => {
      describe('when one of the request fails', () => {
        it('throws an Error', async () => {
          moxios.stubRequest(
            'https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=POLYGON_IO_API_KEY',
            {
              status: 404,
            },
          );
          moxios.stubRequest(
            'https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=POLYGON_IO_API_KEY',
            {
              status: 200,
              response: ticker2,
            },
          );

          await expect(
            polygonIOStockSnapshotFetcher.apply([{ticker: 'UVXY'}, {ticker: 'VIXY'}], {
              symbols: ['UVXY', 'VIXY'],
              timestamp: 1,
            }),
          ).to.rejectedWith(Error);
        });
      });

      describe('when all requests succeed', () => {
        beforeEach(() => {
          moxios.stubRequest(
            'https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=POLYGON_IO_API_KEY',
            {
              status: 200,
              response: responseExample1,
            },
          );
          moxios.stubRequest(
            'https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?apiKey=POLYGON_IO_API_KEY',
            {
              status: 200,
              response: responseExample2,
            },
          );
        });

        describe('when raw param is true', () => {
          it('responds with the requests tickers merged in one tickers array', async () => {
            const result = await polygonIOStockSnapshotFetcher.apply([{ticker: 'UVXY'}, {ticker: 'VIXY'}], {
              symbols: ['UVXY', 'VIXY'],
              timestamp: 1,
            });

            expect(result).to.eql({
              tickers: [ticker1, ticker2],
            });
          });
        });

        describe('when raw param is false', () => {
          it('response the requests tickers lastPrice.p in an array', async () => {
            const result = await polygonIOStockSnapshotFetcher.apply([{ticker: 'UVXY'}, {ticker: 'VIXY'}], {
              symbols: ['UVXY', 'VIXY'],
              timestamp: 1,
            });

            expect(result).to.eql([ticker1.lastTrade.p, ticker2.lastTrade.p]);
          });
        });
      });
    });
  });
});
