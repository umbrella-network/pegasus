import chai from 'chai';

import sinon, {SinonFakeTimers} from 'sinon';
import BinancePriceMultiFetcher, {InputParams} from '../../../src/services/fetchers/BinancePriceMultiFetcher.js';
import Settings from '../../../src/types/Settings.js';
import fetcherAPILimit from '../../../src/config/fetcherAPILimit.js';

import moxios from 'moxios';
import {getTestContainer} from '../../helpers/getTestContainer.js';

const {expect} = chai;

describe.only('BinancePriceMultiFetcher', () => {
  let clock: SinonFakeTimers;
  let settings: Settings;
  let binancePriceMultiFetcher: BinancePriceMultiFetcher;

  const params: InputParams[] = [
    {id: 'BTC', currency: 'USDT'},
    {id: 'ETH', currency: 'USDT'},
  ];

  const responseExample = [
    {
      symbol: 'BTCUSDT',
      price: '64847.22000000',
    },
    {
      symbol: 'ETHUSDT',
      price: '3389.96000000',
    },
  ];

  beforeEach(async () => {
    moxios.install();
    clock = sinon.useFakeTimers(new Date('2023-05-11'));

    const container = getTestContainer();

    settings = {
      api: {
        binance: {
          timeout: 5000,
          maxBatchSize: 500,
        },
      },
    } as Settings;

    container.rebind('Settings').toConstantValue(settings);
    container.bind('FetcherAPILimit').toConstantValue(fetcherAPILimit);

    container.bind(BinancePriceMultiFetcher).toSelf();

    binancePriceMultiFetcher = container.get(BinancePriceMultiFetcher);
  });

  afterEach(() => {
    moxios.uninstall();
    clock.restore();
  });

  it('sends valid request and correctly transforms response from binance', async () => {
    const expectOutput = [
      {
        currency: 'USDT',
        id: 'BTC',
        value: '64847.22000000',
      },
      {currency: 'USDT', id: 'ETH', value: '3389.96000000'},
    ];

    moxios.stubRequest(/https:\/\/api.binance.com\/api\/v3\/ticker\/price\?.*/, {
      status: 200,
      response: responseExample,
    });

    const result = await binancePriceMultiFetcher.apply(params);
    expect(result).to.be.an('array').with.lengthOf(2);

    expect(result).to.be.deep.eq(expectOutput);
  });

  describe('when response status is 418/429', () => {
    it('waits Retry-After seconds to call endpoint', async () => {
      const retrySeconds = 10;

      const expectOutput = [
        {
          currency: 'USDT',
          id: 'BTC',
          value: '64847.22000000',
        },
        {currency: 'USDT', id: 'ETH', value: '3389.96000000'},
      ];

      moxios.stubRequest(/https:\/\/api.binance.com\/api\/v3\/ticker\/price\?.*/, {
        status: 418,
        headers: {
          'Retry-After': retrySeconds,
        },
      });

      await expect(binancePriceMultiFetcher.apply(params)).to.be.rejected;

      moxios.uninstall();
      moxios.install();

      moxios.stubRequest(/https:\/\/api.binance.com\/api\/v3\/ticker\/price\?.*/, {
        status: 200,
        response: responseExample,
      });

      const result = await binancePriceMultiFetcher.apply(params);
      expect(result).to.be.deep.eq([]);

      clock.tick(11000);

      const resultAfterRetry = await binancePriceMultiFetcher.apply(params);

      expect(resultAfterRetry).to.be.deep.eq(expectOutput);
    });
  });
});
