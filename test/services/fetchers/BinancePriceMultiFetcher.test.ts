import chai from 'chai';
import moxios from 'moxios';
import sinon, {SinonFakeTimers} from 'sinon';

import BinancePriceMultiFetcher, {InputParams} from '../../../src/services/fetchers/BinancePriceMultiFetcher.js';
import fetcherAPILimit from '../../../src/config/fetcherAPILimit.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';
import Settings from '../../../src/types/Settings.js';

const {expect} = chai;

describe('BinancePriceMultiFetcher', () => {
  let clock: SinonFakeTimers;
  let settings: Settings;
  let binancePriceMultiFetcher: BinancePriceMultiFetcher;

  const params: InputParams[] = [
    {symbol: 'BTCUSDT', inverse: false},
    {symbol: 'ETHUSDT', inverse: false},
  ];

  const binanceResponse = [
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
    const expectOutput = [64847.22, 3389.96];

    moxios.stubRequest('https://www.binance.com/api/v3/ticker/price', {
      status: 200,
      response: binanceResponse,
    });

    const result = await binancePriceMultiFetcher.apply(params, {symbols: []});

    expect(result.prices).to.be.an('array').with.lengthOf(2);
    expect(result.prices).to.be.deep.eq(expectOutput);
  });
});
