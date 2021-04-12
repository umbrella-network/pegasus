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

    expect(await priceAggregator.value(symbol, date + 11)).to.be.eq(5);
  });

  it('check for the latest price', async () => {
    const date = Date.now();

    await priceAggregator.add(symbol, 4, date + 5);
    await priceAggregator.add(symbol, 5, date + 10);
    await priceAggregator.add(symbol, 6, date + 15);

    expect(await priceAggregator.value(symbol, date + 16)).to.be.eq(6);
  });

  it('check if the price is too old', async () => {
    const date = Date.now();

    await priceAggregator.add(symbol, 4, date + 5);
    await priceAggregator.add(symbol, 5, date + 10);
    await priceAggregator.add(symbol, 9, date + 15);

    expect(await priceAggregator.value(symbol, date + 5)).to.be.null;
  });

  it('check average price 1', async () => {
    await priceAggregator.add(symbol, 3, 0);
    await priceAggregator.add(symbol, 4, 5);
    await priceAggregator.add(symbol, 5, 10);

    expect(await priceAggregator.averageValue(symbol, 4, 11)).to.be.eq(4.5);
  });

  it('check average price 2', async () => {
    const date = Date.now();

    await priceAggregator.add(symbol, 3, date);
    await priceAggregator.add(symbol, 4, date + 5);
    await priceAggregator.add(symbol, 9, date + 8);
    await priceAggregator.add(symbol, 5, date + 10);

    expect(await priceAggregator.averageValue(symbol, date + 4, date + 11)).to.be.eq(6);
  });

  it('check average of prices that do not exist', async () => {
    const date = Date.now();

    await priceAggregator.add(symbol, 3, date);
    await priceAggregator.add(symbol, 4, date + 5);
    await priceAggregator.add(symbol, 9, date + 8);
    await priceAggregator.add(symbol, 5, date + 10);

    expect(await priceAggregator.averageValue(symbol, date + 5, date + 8)).to.be.null;
  });

  it('check clean up', async () => {
    const date = Date.now();

    await priceAggregator.add(symbol, 3, date);
    await priceAggregator.add(symbol, 4, date + 5);
    await priceAggregator.add(symbol, 9, date + 8);
    await priceAggregator.add(symbol, 5, date + 10);

    await priceAggregator.cleanUp(symbol, date + 8);

    expect(await priceAggregator.averageValue(symbol, 0, date + 11)).to.be.eq(7);
  });

  it('check count', async () => {
    await priceAggregator.add(symbol, 3, 1000);
    await priceAggregator.add(symbol, 4, 1001);
    await priceAggregator.add(symbol, 9, 1002);
    await priceAggregator.add(symbol, 5, 1003);

    expect(await priceAggregator.count(symbol)).to.be.eq(4);
  });

  it('check count with beforeTimestamp', async () => {
    await priceAggregator.add(symbol, 3, 1000);
    await priceAggregator.add(symbol, 4, 1001);
    await priceAggregator.add(symbol, 9, 1002);
    await priceAggregator.add(symbol, 5, 1003);

    expect(await priceAggregator.count(symbol, 1003)).to.be.eq(3);
  });

  it('check count after deletion', async () => {
    await priceAggregator.add(symbol, 3, 1000);
    await priceAggregator.add(symbol, 4, 1001);
    await priceAggregator.add(symbol, 9, 1002);
    await priceAggregator.add(symbol, 5, 1003);

    await priceAggregator.cleanUp(symbol, 1003);

    expect(await priceAggregator.count(symbol, 1004)).to.be.eq(1);
  });

  it('delete before a certain value', async () => {
    await priceAggregator.add(symbol, 3, 1000);
    await priceAggregator.add(symbol, 4, 1001);
    await priceAggregator.add(symbol, 9, 1002);
    await priceAggregator.add(symbol, 5, 1003);
    await priceAggregator.add(symbol, 3, 1004);
    await priceAggregator.add(symbol, 4, 1005);
    await priceAggregator.add(symbol, 5, 1006);

    const {timestamp}: any = await priceAggregator.valueTimestamp(symbol, 1003);

    await priceAggregator.cleanUp(symbol, timestamp);

    expect(await priceAggregator.count(symbol, 10000)).to.be.eq(4);
  });
});
