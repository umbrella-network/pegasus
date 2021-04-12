import {inject, injectable} from 'inversify';
import IORedis from 'ioredis';
import {price as Price} from '@umb-network/validator';

import Settings from '../types/Settings';

@injectable()
class PriceAggregator {
  connection: IORedis.Redis;

  constructor(@inject('Settings') settings: Settings) {
    this.connection = new IORedis(settings.redis.url);
  }

  /**
   * Adds a value with a timestamp to a sorted map
   */
  async add(symbol: string, price: number, timestamp: number): Promise<void> {
    try {
      await this.connection.zadd(symbol, timestamp, price);
    } catch (err) {
      console.error(err, JSON.stringify({symbol, price, timestamp}));

      throw err;
    }
  }

  /**
   * Gets a value before the provided timestamp
   */
  async value(symbol: string, beforeTimestamp: number): Promise<number | null> {
    try {
      const result = await this.connection.zrevrangebyscore(symbol, `(${beforeTimestamp}`, '-inf', 'LIMIT', 0, 1);

      return result.length ? parseFloat(result[0]) : null;
    } catch (err) {
      console.error(err, JSON.stringify({symbol, beforeTimestamp}));

      throw err;
    }
  }

  /**
   * Gets a value and a timestamp before the provided timestamp
   */
  async valueTimestamp(symbol: string, timestamp: number): Promise<{value: number; timestamp: number} | null> {
    try {
      const result = await this.connection.zrevrangebyscore(
        symbol,
        `(${timestamp}`,
        '-inf',
        'WITHSCORES',
        'LIMIT',
        0,
        1,
      );

      return result.length ? {value: parseFloat(result[0]), timestamp: parseInt(result[1])} : null;
    } catch (err) {
      console.error(err, JSON.stringify({symbol, timestamp}));

      throw err;
    }
  }

  /**
   * Gets all values and timestamps of a sorted map
   */
  async valueTimestamps(symbol: string): Promise<{value: number; timestamp: number}[]> {
    try {
      const vt = await this.connection.zrevrangebyscore(symbol, '+inf', '-inf', 'WITHSCORES');

      return Array.from(Array(vt.length / 2).keys()).map((i) => ({
        value: parseInt(vt[i * 2]),
        timestamp: parseInt(vt[i * 2 + 1]),
      }));
    } catch (err) {
      console.error(err, JSON.stringify({symbol}));

      throw err;
    }
  }

  /**
   * Gets an average value between timestamps
   */
  async averageValue(symbol: string, beforeTimestamp: number, afterTimestamp: number): Promise<number | null> {
    const result = await this.connection.zrevrangebyscore(symbol, `(${afterTimestamp}`, `(${beforeTimestamp}`);

    return result.length ? Price.mean(result.map(parseFloat)) : null;
  }

  /**
   * Cleans up values before the provided timestamp
   */
  async cleanUp(symbol: string, beforeTimestamp?: number): Promise<number> {
    if (beforeTimestamp) {
      return this.connection.zremrangebyscore(symbol, '-inf', `(${beforeTimestamp}`);
    }

    return this.connection.zremrangebyscore(symbol, '-inf', '+inf');
  }

  /**
   * Counts values before the provided timestamp
   */
  async count(symbol: string, beforeTimestamp?: number): Promise<number> {
    if (beforeTimestamp) {
      return this.connection.zcount(symbol, '-inf', `(${beforeTimestamp}`);
    }

    return this.connection.zcount(symbol, '-inf', '+inf');
  }

  async close(): Promise<void> {
    return this.connection.disconnect();
  }
}

export default PriceAggregator;
