/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import { Container } from 'inversify';
import Settings from '../../../src/types/Settings';
import { expect } from 'chai';
import CoinmarketcapHistoHourFetcher from '../../../src/services/fetchers/CoinmarketcapHistoHourFetcher';
import moxios from 'moxios';

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe('CoinmarketcapHistoDayFetcher', () => {
  let settings: Settings;

  let coinmarketcapHistoHourFetcher: CoinmarketcapHistoHourFetcher;

  beforeEach(async () => {
    moxios.install();

    const container = new Container();

    settings = {
      api: {
        coinmarketcap: {
          apiKey: 'COINMARKETCAP_API_KEY',
          timeout: 5000,
        },
      },
    } as Settings;

    container.bind('Settings').toConstantValue(settings);

    container.bind(CoinmarketcapHistoHourFetcher).toSelf();

    coinmarketcapHistoHourFetcher = container.get(CoinmarketcapHistoHourFetcher);
  });

  afterEach(() => {
    moxios.uninstall();
  });

  it('sends valid request and correctly transforms response from coinmarketcap', async () => {
    const responseExample = {
      "status": {
        "timestamp": "2021-06-28T11:43:18.035Z",
        "error_code": 0,
        "error_message": null,
        "elapsed": 26,
        "credit_count": 1,
        "notice": null
      },
      "data": {
        "id": 8874,
        "name": "DAFI Protocol",
        "symbol": "DAFI",
        "quotes": [{
          "time_open": "2021-06-28T09:00:00.000Z",
          "time_close": "2021-06-28T09:59:59.999Z",
          "time_high": "2021-06-28T09:01:07.000Z",
          "time_low": "2021-06-28T09:58:08.000Z",
          "quote": {
            "USD": {
              "open": 0.01984605072496,
              "high": 0.01984762671449,
              "low": 0.01944127705114,
              "close": 0.01945004331444,
              "volume": null,
              "market_cap": 5771640.72,
              "timestamp": "2021-06-28T09:59:59.999Z"
            }
          }
        }, {
          "time_open": "2021-06-28T10:00:00.000Z",
          "time_close": "2021-06-28T10:59:59.999Z",
          "time_high": "2021-06-28T10:03:07.000Z",
          "time_low": "2021-06-28T10:51:07.000Z",
          "quote": {
            "USD": {
              "open": 0.01944665532293,
              "high": 0.01952834955751,
              "low": 0.01898509065852,
              "close": 0.01912046509562,
              "volume": null,
              "market_cap": 5673841.09,
              "timestamp": "2021-06-28T10:59:59.999Z"
            }
          }
        }]
      }
    };

    moxios.stubRequest(/https:\/\/pro-api.coinmarketcap.com\/v1\/cryptocurrency.*/, {
      status: 200,
      response: responseExample,
    });

    const result = await coinmarketcapHistoHourFetcher.apply({
      symbol: 'DAFI',
      convert: 'USD',
      count: 3,
    });

    expect(moxios.requests.mostRecent().config.headers?.Authorization).to.be.eq('Apikey COINMARKETCAP_API_KEY');

    expect(result).to.be.an('array').with.lengthOf(2);
    expect(result).to.be.deep.eq([
      [
        {
          high: 0.01984762671449,
          low: 0.01944127705114,
          open: 0.01984605072496,
          close: 0.01945004331444,
        },
        0,
      ],
      [
        {
          high: 0.01952834955751,
          low: 0.01898509065852,
          open: 0.01944665532293,
          close: 0.01912046509562,
        },
        0,
      ],
    ]);
  });
});
