/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {Container} from 'inversify';
import Settings from '../../../src/types/Settings';
import chai, {expect} from 'chai';
import CoinmarketcapHistoDayFetcher from '../../../src/services/fetchers/CoinmarketcapHistoDayFetcher';
import moxios from 'moxios';
import chaiAsPromised from 'chai-as-promised';

chai.use(chaiAsPromised);

describe('CoinmarketcapHistoDayFetcher', () => {
  let settings: Settings;

  let coinmarketcapHistoDayFetcher: CoinmarketcapHistoDayFetcher;

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

    container.bind(CoinmarketcapHistoDayFetcher).toSelf();

    coinmarketcapHistoDayFetcher = container.get(CoinmarketcapHistoDayFetcher);
  });

  afterEach(() => {
    moxios.uninstall();
  });

  it('sends valid request and correctly transforms response from coinmarketcap', async () => {
    const responseExample = {
      "status": {
        "timestamp": "2021-06-28T11:05:08.831Z",
        "error_code": 0,
        "error_message": null,
        "elapsed": 25,
        "credit_count": 1,
        "notice": null
      },
      "data": {
        "id": 8874,
        "name": "DAFI Protocol",
        "symbol": "DAFI",
        "quotes": [{
          "time_open": "2021-06-26T00:00:00.000Z",
          "time_close": "2021-06-26T23:59:59.999Z",
          "time_high": "2021-06-26T05:22:07.000Z",
          "time_low": "2021-06-26T08:52:07.000Z",
          "quote": {
            "USD": {
              "open": 0.01920489,
              "high": 0.01982096,
              "low": 0.01817868,
              "close": 0.01919132,
              "volume": 153270.54,
              "market_cap": 5675674.14,
              "timestamp": "2021-06-26T23:59:59.999Z"
            }
          }
        }, {
          "time_open": "2021-06-27T00:00:00.000Z",
          "time_close": "2021-06-27T23:59:59.999Z",
          "time_high": "2021-06-27T23:51:07.000Z",
          "time_low": "2021-06-27T10:01:07.000Z",
          "quote": {
            "USD": {
              "open": 0.01920292,
              "high": 0.02047754,
              "low": 0.01865968,
              "close": 0.02026433,
              "volume": 212662.98,
              "market_cap": 5993008.94,
              "timestamp": "2021-06-27T23:59:59.999Z"
            }
          }
        }]
      }
    };

    moxios.stubRequest(/https:\/\/pro-api.coinmarketcap.com\/v1\/cryptocurrency.*/, {
      status: 200,
      response: responseExample,
    });

    const result = await coinmarketcapHistoDayFetcher.apply({
      symbol: 'DAFI',
      convert: 'USD',
      count: 3,
    });

    expect(moxios.requests.mostRecent().config.headers?.Authorization).to.be.eq('Apikey COINMARKETCAP_API_KEY');

    expect(result).to.be.an('array').with.lengthOf(2);
    expect(result).to.be.deep.eq([
      [
        {
          high: 0.01982096,
          low: 0.01817868,
          open: 0.01920489,
          close: 0.01919132,
        },
        153270.54,
      ],
      [
        {
          high: 0.02047754,
          low: 0.01865968,
          open: 0.01920292,
          close: 0.02026433,
        },
        212662.98,
      ],
    ]);
  });
});
