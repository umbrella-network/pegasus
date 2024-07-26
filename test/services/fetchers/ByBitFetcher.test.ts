import chai from 'chai';
import moxios from 'moxios';

import ByBitSpotFetcher from '../../../src/services/fetchers/ByBitSpotFetcher.js';
import Settings from '../../../src/types/Settings.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';

const {expect} = chai;

describe('ByBitSpotFetcher', () => {
  let byBitSpotFetcher: ByBitSpotFetcher;

  beforeEach(async () => {
    moxios.install();

    const settings = {
      api: {
        byBit: {
          timeout: 5000,
        },
      },
      blockchain: {
        multiChains: {
          rootstock: {},
        },
      },
      environment: 'testing',
    } as Settings;

    const container = getTestContainer();
    container.rebind('Settings').toConstantValue(settings);
    container.bind(ByBitSpotFetcher).toSelf();

    byBitSpotFetcher = container.get(ByBitSpotFetcher);
  });

  afterEach(() => {
    moxios.uninstall();
  });

  it('sends valid request and correctly transforms response from byBit', async () => {
    moxios.stubRequest('https://api.bybit.com/v5/market/tickers?category=spot', {
      status: 200,
      response: {
        result: {
          category: 'spot',
          list: [
            {
              symbol: 'BTCUSD',
              usdIndexPrice: '65790.175466',
            },
            {
              symbol: 'XRPBTC',
            },
            {
              symbol: 'ETHUSDT',
              usdIndexPrice: '3582.907868',
            },
          ],
        },
      },
    });

    const result = await byBitSpotFetcher.apply([{symbol: 'BTCUSD'}, {symbol: 'XRPBTC'}, {symbol: 'ETHUSDT'}], {
      symbols: [],
    });
    expect(result.prices).to.be.deep.eq([65790.175466, undefined, 3582.907868]);
  });
});
