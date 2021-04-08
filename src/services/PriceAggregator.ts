import {inject, injectable} from 'inversify';
import IORedis from 'ioredis';
import {price as Price} from "@umb-network/validator";

import Settings from '../types/Settings';

@injectable()
class PriceAggregator {
  connection: IORedis.Redis;

  constructor(
    @inject('Settings') settings: Settings,
  ) {
    this.connection = new IORedis(settings.redis.url);
  }

  async add(symbol: string, price: number, timestamp: number): Promise<void> {
    try {
      await this.connection.zadd(symbol, timestamp, price);
    } catch (err) {
      console.error(err, JSON.stringify({symbol, price, timestamp}));

      throw err;
    }
  }

  async value(symbol: string, timestamp: number): Promise<number | null> {
    try {
      const result = await this.connection.zrevrangebyscore(symbol, timestamp, '-inf','LIMIT', 0, 1);

      return result.length ? parseFloat(result[0]) : null;
    } catch (err) {
      console.error(err, JSON.stringify({symbol, timestamp}));

      throw err;
    }
  }

  async valueTimestamp(symbol: string, timestamp: number): Promise<[number, number] | null> {
    try {
      const result = await this.connection.zrevrangebyscore(symbol, timestamp, '-inf','WITHSCORES', 'LIMIT', 0, 1);

      return result.length ? [parseFloat(result[0]), parseInt(result[1])] : null;
    } catch (err) {
      console.error(err, JSON.stringify({symbol, timestamp}));

      throw err;
    }
  }

  async averageValue(symbol: string, fromTimestamp: number, toTimestamp: number): Promise<number | null> {
    const result = await this.connection.zrevrangebyscore(symbol, toTimestamp, fromTimestamp);

    return result.length ? Price.mean(result.map(parseFloat)) : null;
  }

  async cleanUp(symbol: string, beforeTimestamp?: number): Promise<number> {
    if (beforeTimestamp) {
      return this.connection.zremrangebyscore(symbol, '-inf', `(${beforeTimestamp}`);
    }

    return this.connection.zremrangebyscore(symbol, '-inf', '+inf');
  }

  async close(): Promise<void> {
    return this.connection.disconnect();
  }
}

export default PriceAggregator;
