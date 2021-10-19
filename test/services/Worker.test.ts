import 'reflect-metadata';
import {Container} from 'inversify';
import {expect} from 'chai';
import IORedis, {Redis} from 'ioredis';

import {loadTestEnv} from '../helpers/loadTestEnv';
import Settings from '../../src/types/Settings';
import MockedWorker from '../mocks/worker';

describe('Worker', () => {
  let mockedWorker: MockedWorker;
  let settings: Settings;
  let connection: IORedis.Redis;
  const timer = (ms: number) => new Promise((res) => setTimeout(res, ms));

  before(async () => {
    const config = loadTestEnv();

    settings = {
      redis: {
        url: config.REDIS_URL,
      },
    } as Settings;

    const container = new Container();

    container.bind('Settings').toConstantValue(settings);
    container.bind<Redis>('Redis').toConstantValue(new IORedis(settings.redis.url));
    container.bind(MockedWorker).to(MockedWorker);

    mockedWorker = container.get(MockedWorker);
    mockedWorker.start();
  });

  beforeEach(async () => {
    await connection.flushall();
    await mockedWorker.pause();
  });

  after(async () => {
    await mockedWorker.close();
    await connection.disconnect();
  });

  it('enqueues jobs and don`t delete them', async () => {
    for (let counter = 0; counter < 10; counter++) {
      await mockedWorker.enqueue({});
    }

    let items = await connection.keys('bull:MockedWorker:*');
    expect(items.length).to.be.eq(14);

    await mockedWorker.resume();
    await timer(1000);

    items = await connection.keys('bull:MockedWorker:*');
    expect(items.length).to.be.eq(14);
  });

  it('enqueues jobs and delete them', async () => {
    for (let counter = 0; counter < 10; counter++) {
      await mockedWorker.enqueue(
        {},
        {
          removeOnComplete: true,
          removeOnFail: true,
        },
      );
    }

    let items = await connection.keys('bull:MockedWorker:*');
    expect(items.length).to.be.eq(13);

    await mockedWorker.resume();
    await timer(1000);

    items = await connection.keys('bull:MockedWorker:*');
    expect(items.length).to.be.eq(2);
  });
});
