import {inject, injectable} from 'inversify';
import IORedis from 'ioredis';
import Settings from '../types/Settings';
import {price} from "@umb-network/validator";

@injectable()
class PriceAggregator {
  connection: IORedis.Redis;

  constructor(
    @inject('Settings') settings: Settings,
  ) {
    this.connection = new IORedis(settings.redis.url);
  }

  async add(symbol: string, price: number, timestamp: number): Promise<void> {
    await this.connection.zadd(symbol, timestamp, price);
  }

  async value(symbol: string, timestamp: number): Promise<number | null> {
    const result = await this.connection.zrevrangebyscore(symbol, timestamp, '-inf','LIMIT', 0, 1);

    return result.length ? parseFloat(result[0]) : null;
  }

  async averageValue(symbol: string, fromTimestamp: number, toTimestamp: number): Promise<number | null> {
    const result = await this.connection.zrevrangebyscore(symbol, toTimestamp, fromTimestamp);

    return result.length ? price.mean(result.map(parseFloat)) : null;
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
