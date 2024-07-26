import chai from 'chai';
import moxios from 'moxios';

import ByBitSpotFetcher, {InputParams} from '../../../src/services/fetchers/ByBitSpotFetcher.js';
import Settings from '../../../src/types/Settings.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';

const {expect} = chai;

describe('ByBitSpotFetcher', () => {
  let settings: Settings;
  let byBitSpotFetcher: ByBitSpotFetcher;

  const params: InputParams[] = [{symbol: 'BTCUSD'}, {symbol: 'XRPBTC'}, {symbol: 'ETHUSDT'}];

  const responseSpotExample = {
    retCode: 0,
    retMsg: 'OK',
    result: {
      category: 'spot',
      list: [
        {
          symbol: 'BTCUSD',
          bid1Price: '65795.42',
          bid1Size: '0.064474',
          ask1Price: '65795.43',
          ask1Size: '0.136738',
          lastPrice: '65798.43',
          prevPrice24h: '67960.35',
          price24hPcnt: '-0.0318',
          highPrice24h: '68080.43',
          lowPrice24h: '64519.94',
          turnover24h: '1376168592.49354387',
          volume24h: '20666.989446',
          usdIndexPrice: '65790.175466',
        },
        {
          symbol: 'XRPBTC',
          bid1Price: '0.00000964',
          bid1Size: '4054',
          ask1Price: '0.00000966',
          ask1Size: '8869.1',
          lastPrice: '0.00000966',
          prevPrice24h: '0.00000896',
          price24hPcnt: '0.0781',
          highPrice24h: '0.00000989',
          lowPrice24h: '0.00000894',
          turnover24h: '52.911899388',
          volume24h: '5529093.7',
        },
        {
          symbol: 'ETHUSDT',
          bid1Price: '3582.41',
          bid1Size: '0.499',
          ask1Price: '3582.42',
          ask1Size: '0.18',
          lastPrice: '3582.41',
          prevPrice24h: '3435.55',
          price24hPcnt: '0.0427',
          highPrice24h: '3660.74',
          lowPrice24h: '3420.22',
          turnover24h: '374841610.0368103',
          volume24h: '106148.83748',
          usdIndexPrice: '3582.907868',
        },
      ],
    },
    retExtInfo: {},
    time: 1710809300476,
  };

  beforeEach(async () => {
    moxios.install();

    settings = {
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
      response: responseSpotExample,
    });

    const result = await byBitSpotFetcher.apply(params, {symbols: []});
    expect(result.prices).to.be.deep.eq([65790.175466, undefined, 3582.907868]);
  });
});
