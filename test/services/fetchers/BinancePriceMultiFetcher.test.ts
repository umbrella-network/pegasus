import chai from 'chai';
import moxios from 'moxios';
import sinon, {SinonFakeTimers} from 'sinon';

import {BinancePriceFetcher} from '../../../src/services/fetchers/index.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';
import Settings from '../../../src/types/Settings.js';

const {expect} = chai;

describe('BinancePriceMultiFetcher', () => {
  let binancePriceMultiFetcher: BinancePriceFetcher;
  let clock: SinonFakeTimers;

  beforeEach(async () => {
    moxios.install();
    clock = sinon.useFakeTimers(new Date('2023-05-11'));

    const settings = {
      api: {
        binance: {
          timeout: 5000,
          maxBatchSize: 500,
        },
      },
      blockchain: {
        multiChains: {
          rootstock: {},
        },
      },
    } as Settings;

    const container = getTestContainer();
    container.bind(BinancePriceFetcher).toSelf();
    container.rebind('Settings').toConstantValue(settings);
    binancePriceMultiFetcher = container.get(BinancePriceFetcher);
  });

  afterEach(() => {
    moxios.uninstall();
    clock.restore();
  });

  it.skip('sends valid request and correctly transforms response from binance', async () => {
    const expectOutput = [64847.22, 3389.96];

    moxios.stubRequest('https://www.binance.com/api/v3/ticker/price', {
      status: 200,
      response: [
        {symbol: 'BTCUSDT', price: '64847.22000000'},
        {symbol: 'ETHUSDT', price: '3389.96000000'},
      ],
    });

    const result = await binancePriceMultiFetcher.apply(
      [
        {symbol: 'BTCUSDT', inverse: false},
        {symbol: 'ETHUSDT', inverse: false},
      ],
      {symbols: []},
    );

    expect(result.prices).to.be.an('array').with.lengthOf(2);
    expect(result.prices).to.be.deep.eq(expectOutput);
  });
});
