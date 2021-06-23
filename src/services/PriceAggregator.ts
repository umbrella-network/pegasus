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
  async add(symbol: string, value: number, timestamp: number): Promise<void> {
    try {
      await this.connection.zadd(symbol, timestamp, this.formatValue(value, timestamp));
    } catch (err) {
      console.error(err, JSON.stringify({symbol, value, timestamp}));

      throw err;
    }
  }

  /**
   * Gets a value before the provided timestamp
   */
  async value(symbol: string, beforeTimestamp: number): Promise<number | null> {
    try {
      const result = await this.connection.zrevrangebyscore(symbol, `(${beforeTimestamp}`, '-inf', 'LIMIT', 0, 1);

      return result.length ? this.parseValue(result[0]) : null;
    } catch (err) {
      console.error(err, JSON.stringify({symbol, beforeTimestamp}));

      throw err;
    }
  }

  /**
   * Gets a value between the provided timestamps
   */
  async valueAfter(symbol: string, beforeTimestamp: number, afterTimestamp: number): Promise<number | null> {
    try {
      const result = await this.connection.zrevrangebyscore(
        symbol,
        `(${beforeTimestamp}`,
        `(${afterTimestamp}`,
        'LIMIT',
        0,
        1,
      );

      return result.length ? this.parseValue(result[0]) : null;
    } catch (err) {
      console.error(err, JSON.stringify({symbol, beforeTimestamp}));

      throw err;
    }
  }

  /**
   * Gets a value and a timestamp before the provided timestamp
   */
  async valueTimestamp(symbol: string, beforeTimestamp: number): Promise<{value: number; timestamp: number} | null> {
    try {
      const result = await this.connection.zrevrangebyscore(symbol, `(${beforeTimestamp}`, '-inf', 'LIMIT', 0, 1);

      return result.length ? this.parseValueTimestamp(result[0]) : null;
    } catch (err) {
      console.error(err, JSON.stringify({symbol, beforeTimestamp}));

      throw err;
    }
  }

  /**
   * Gets all values and timestamps of a sorted map
   */
  async valueTimestamps(symbol: string): Promise<{value: number; timestamp: number}[]> {
    try {
      const vt = await this.connection.zrevrangebyscore(symbol, '+inf', '-inf');

      return vt.map(this.parseValueTimestamp);
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

    return result.length ? Price.mean(result.map(this.parseValue)) : null;
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

  private formatValue(value: number, timestamp: number): string {
    return `${timestamp}:${value}`;
  }

  private parseValue(formattedValue: string): number {
    return parseFloat(formattedValue.split(':')[1]);
  }

  private parseValueTimestamp(formattedValue: string): {value: number; timestamp: number} {
    const [timestamp, value] = formattedValue.split(':');
    return {value: parseFloat(value), timestamp: parseInt(timestamp)};
  }
}

export default PriceAggregator;
