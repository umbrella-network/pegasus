/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {Container} from 'inversify';
import Settings from '../../../src/types/Settings';
import {expect} from 'chai';
import PolygonIOStockSnapshotFetcher from '../../../src/services/fetchers/PolygonIOStockSnapshotFetcher';
import moxios from 'moxios';

import {mockedLogger} from '../../mocks/logger';
import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe.only('PolygonIOStockSnapshotFetcher', () => {
  let settings: Settings;

  let polygonIOStockSnapshotFetcher: PolygonIOStockSnapshotFetcher;

  beforeEach(async () => {
    moxios.install();

    const container = new Container();

    settings = {
      api: {
        polygonIO: {
          apiKey: 'POLYGON_IO_API_KEY',
          timeout: 5000,
          maxBatchSize: 1,
        },
      },
    } as Settings;

    container.bind('Logger').toConstantValue(mockedLogger);
    container.bind('Settings').toConstantValue(settings);

    container.bind(PolygonIOStockSnapshotFetcher).toSelf();

    polygonIOStockSnapshotFetcher = container.get(PolygonIOStockSnapshotFetcher);
  });

  afterEach(() => {
    moxios.uninstall();
  });

  describe('#apply', () => {
    describe('when one request is done', () => {
      it('response an array of tickers object', async () => {
        const responseExample = {
          tickers: [
            {
              ticker: 'UVXY',
            },
          ],
        };

        moxios.stubRequest(
          `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=UVXY&apiKey=POLYGON_IO_API_KEY`,
          {
            status: 200,
            response: responseExample,
          },
        );

        const result = await polygonIOStockSnapshotFetcher.apply({symbols: ['UVXY']}, true);

        expect(result).to.eql({
          tickers: [{ticker: 'UVXY'}],
        });
      });
    });

    describe('when multiple request are done', () => {
      describe('when one of the request fails', () => {
        it('throws an Error', async () => {
          const responseExample = {
            tickers: [
              {
                ticker: 'UVXY',
              },
            ],
          };

          moxios.stubRequest(
            'https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=UVXY&apiKey=POLYGON_IO_API_KEY',
            {
              status: 404,
              response: responseExample,
            },
          );
          const responseExample2 = {
            tickers: [
              {
                ticker: 'VIXY',
              },
            ],
          };

          moxios.stubRequest(
            'https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=VIXY&apiKey=POLYGON_IO_API_KEY',
            {
              status: 200,
              response: responseExample2,
            },
          );

          await expect(polygonIOStockSnapshotFetcher.apply({symbols: ['VIXY', 'UVXY']}, true)).to.rejectedWith(Error);
        });
      });
      describe('when none request fails', () => {
        describe('when raw param is true', () => {
          it('response the requests tickers merged in one tickers array', async () => {
            const responseExample1 = {
              tickers: [
                {
                  ticker: 'UVXY',
                },
              ],
            };
            const responseExample2 = {
              tickers: [
                {
                  ticker: 'VIXY',
                },
              ],
            };

            moxios.stubRequest(
              `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=UVXY&apiKey=POLYGON_IO_API_KEY`,
              {
                status: 200,
                response: responseExample1,
              },
            );
            moxios.stubRequest(
              `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=VIXY&apiKey=POLYGON_IO_API_KEY`,
              {
                status: 200,
                response: responseExample2,
              },
            );

            const result = await polygonIOStockSnapshotFetcher.apply({symbols: ['UVXY', 'VIXY']}, true);

            expect(result).to.eql({
              tickers: [{ticker: 'UVXY'}, {ticker: 'VIXY'}],
            });
          });
          describe('when raw param is false', () => {
            it('response the requests tickers lastPrice.p in an array', async () => {
              const responseExample1 = {
                tickers: [
                  {
                    ticker: 'UVXY',
                    lastTrade: {
                      p: 10.1,
                      t: 12,
                    },
                  },
                ],
              };
              const responseExample2 = {
                tickers: [
                  {
                    ticker: 'VIXY',
                    lastTrade: {
                      p: 20.02,
                      t: 12,
                    },
                  },
                ],
              };

              moxios.stubRequest(
                `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=UVXY&apiKey=POLYGON_IO_API_KEY`,
                {
                  status: 200,
                  response: responseExample1,
                },
              );
              moxios.stubRequest(
                `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers?tickers=VIXY&apiKey=POLYGON_IO_API_KEY`,
                {
                  status: 200,
                  response: responseExample2,
                },
              );

              const result = await polygonIOStockSnapshotFetcher.apply({symbols: ['UVXY', 'VIXY']}, false);

              expect(result).to.eql([10.1, 20.02]);
            });
          });
        });
      });
    });
  });
});
