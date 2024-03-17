import 'reflect-metadata';
import chai from 'chai';
import moxios from 'moxios';
import chaiAsPromised from 'chai-as-promised';

import Settings from '../../../src/types/Settings.js';
import CryptoCompareHistoHourFetcher from '../../../src/services/fetchers/CryptoCompareHistoHourFetcher.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';

chai.use(chaiAsPromised);

const {expect} = chai;

describe('CryptoCompareHistoHourFetcher', () => {
  let settings: Settings;

  let сryptoCompareHistoHourFetcher: CryptoCompareHistoHourFetcher;

  beforeEach(async () => {
    moxios.install();

    settings = {
      api: {
        cryptocompare: {
          apiKey: 'CRYPTOCOMPARE_API_KEY',
          timeout: 5000,
        },
      },
    } as Settings;

    const container = getTestContainer(settings);
    container.bind(CryptoCompareHistoHourFetcher).toSelf();

    сryptoCompareHistoHourFetcher = container.get(CryptoCompareHistoHourFetcher);
  });

  afterEach(() => {
    moxios.uninstall();
  });

  it('sends valid request and correctly transforms response from cryptocompare', async () => {
    const responseExample = {
      Response: 'Success',
      Message: '',
      HasWarning: false,
      Type: 100,
      RateLimit: {},
      Data: {
        Aggregated: false,
        TimeFrom: 1612047600,
        TimeTo: 1612134000,
        Data: [
          {
            time: 1612047600,
            high: 1390.92,
            low: 1372.83,
            open: 1387.78,
            volumefrom: 23341.64,
            volumeto: 32252335.97,
            close: 1379.35,
            conversionType: 'direct',
            conversionSymbol: '',
          },
          {
            time: 1612051200,
            high: 1374.51,
            low: 1366.32,
            open: 1378.89,
            volumefrom: 37530.04,
            volumeto: 51342218.59,
            close: 1368.03,
            conversionType: 'multiply',
            conversionSymbol: 'BTC',
          },
        ],
      },
    };

    moxios.stubRequest(/https:\/\/min-api.cryptocompare.com\/data\/v2\/histohour.*/, {
      status: 200,
      response: responseExample,
    });

    const result = await сryptoCompareHistoHourFetcher.apply({
      fsym: 'ETH',
      tsym: 'USD',
      limit: 30,
    });

    expect(moxios.requests.mostRecent().config.headers?.Authorization).to.be.eq('Apikey CRYPTOCOMPARE_API_KEY');

    expect(result).to.be.an('array').with.lengthOf(2);
    expect(result).to.be.deep.eq([
      [
        {
          high: 1390.92,
          low: 1372.83,
          open: 1387.78,
          close: 1379.35,
        },
        23341.64,
      ],
      [
        {
          high: 1374.51,
          low: 1366.32,
          open: 1378.89,
          close: 1368.03,
        },
        37530.04,
      ],
    ]);
  });
});
