import 'reflect-metadata';
import {Container} from 'inversify';
import {expect} from 'chai';

import {loadTestEnv} from '../helpers/loadTestEnv';
import PriceAggregator from '../../src/services/PriceAggregator';
import Settings from '../../src/types/Settings';

describe('PriceAggregator', () => {
  let priceAggregator: PriceAggregator;
  let settings: Settings;

  const symbol = 'AAPL';

  before(async () => {
    const config = loadTestEnv();

    settings = {
      redis: {
        url: config.REDIS_URL,
      },
    } as Settings;

    const container = new Container();

    container.bind('Settings').toConstantValue(settings);
    container.bind(PriceAggregator).to(PriceAggregator);

    priceAggregator = container.get(PriceAggregator);
  });

  after(async () => {
    await priceAggregator.close();
  });

  afterEach(async () => {
    await priceAggregator.cleanUp(symbol);
  });

  it('check for a historical price', async () => {
    const date = Date.now();

    await priceAggregator.add(symbol, 4, date + 5);
    await priceAggregator.add(symbol, 5, date + 10);
    await priceAggregator.add(symbol, 6, date + 15);

    expect(await priceAggregator.value(symbol, date + 14)).to.be.eq(5);
  });

  it('check for the latest price', async () => {
    const date = Date.now();

    await priceAggregator.add(symbol, 4, date + 5);
    await priceAggregator.add(symbol, 5, date + 10);
    await priceAggregator.add(symbol, 6, date + 15);

    expect(await priceAggregator.value(symbol, date + 15)).to.be.eq(6);
  });

  it('check if the price is too old', async () => {
    const date = Date.now();

    await priceAggregator.add(symbol, 4, date + 5);
    await priceAggregator.add(symbol, 5, date + 10);
    await priceAggregator.add(symbol, 9, date + 15);

    expect(await priceAggregator.value(symbol, date + 4)).to.be.null;
  });

  it('check average price 1', async () => {
    const date = Date.now();

    await priceAggregator.add(symbol, 3, date);
    await priceAggregator.add(symbol, 4, date + 5);
    await priceAggregator.add(symbol, 5, date + 10);

    expect(await priceAggregator.averageValue(symbol, date + 5, date + 10)).to.be.eq(4.5);
  });

  it('check average price 2', async () => {
    const date = Date.now();

    await priceAggregator.add(symbol, 3, date);
    await priceAggregator.add(symbol, 4, date + 5);
    await priceAggregator.add(symbol, 9, date + 8);
    await priceAggregator.add(symbol, 5, date + 10);

    expect(await priceAggregator.averageValue(symbol, date + 5, date + 10)).to.be.eq(6);
  });

  it('check average price on old data', async () => {
    const date = Date.now();

    await priceAggregator.add(symbol, 3, date);
    await priceAggregator.add(symbol, 4, date + 5);
    await priceAggregator.add(symbol, 9, date + 8);
    await priceAggregator.add(symbol, 5, date + 10);

    expect(await priceAggregator.averageValue(symbol, date + 11, date + 12)).to.be.null;
  });

  it('check clean up', async () => {
    const date = Date.now();

    await priceAggregator.add(symbol, 3, date);
    await priceAggregator.add(symbol, 4, date + 5);
    await priceAggregator.add(symbol, 9, date + 8);
    await priceAggregator.add(symbol, 5, date + 10);

    await priceAggregator.cleanUp(symbol, date + 8);

    expect(await priceAggregator.averageValue(symbol, 0, date + 10)).to.be.eq(7);
  });
});
