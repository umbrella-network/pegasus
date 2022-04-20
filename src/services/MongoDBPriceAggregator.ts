import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import {MongoDBPriceRepository} from '../repositories/MongoDBPriceRepository';
import {getModelForClass} from '@typegoose/typegoose';
import {Price} from '../models/Price';

@injectable()
export default class MongoDBPriceAggregator {
  @inject('Logger') logger!: Logger;
  @inject(MongoDBPriceRepository) priceRepository!: MongoDBPriceRepository;

  async add(symbol: string, value: number, timestamp: number): Promise<void> {
    await this.priceRepository.save({
      source: 'PriceAggregator',
      symbol,
      value,
      timestamp: new Date(timestamp * 1000),
    });
  }

  /**
   * Gets a value before the provided timestamp
   */
  async value(symbol: string, beforeTimestamp: number): Promise<number | null> {
    return (await this.valueTimestamp(symbol, beforeTimestamp))?.value || null;
  }

  /**
   * Gets a value between the provided timestamps
   */
  async valueAfter(symbol: string, beforeTimestamp: number, afterTimestamp: number): Promise<number | null> {
    const price = await this.priceRepository.getLatestPrice({
      source: 'PriceAggregator',
      symbol,
      timestamp: {from: new Date(afterTimestamp * 1000), to: new Date(beforeTimestamp * 1000)},
    });

    return price || null;
  }

  /**
   * Gets a value and a timestamp before the provided timestamp
   */
  async valueTimestamp(symbol: string, beforeTimestamp: number): Promise<{value: number; timestamp: number} | null> {
    const price = await this.priceRepository.getLatestPriceRecord({
      source: 'PriceAggregator',
      symbol,
      timestamp: {to: new Date(beforeTimestamp * 1000)},
    });

    return price ? {timestamp: price.timestamp.getTime() / 1000, value: price.value} : null;
  }

  /**
   * Gets all values and timestamps of a sorted map
   */
  async valueTimestamps(symbol: string): Promise<{value: number; timestamp: number}[]> {
    const prices = await getModelForClass(Price).find({source: 'PriceAggregator', symbol}).exec();
    return prices.map((price) => ({timestamp: price.timestamp.getTime() / 1000, value: price.value}));
  }

  /**
   * Cleans up values before the provided timestamp
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async cleanUp(symbol: string, beforeTimestamp?: number): Promise<number> {
    return 0;
  }

  /**
   * Counts values before the provided timestamp
   */
  async count(symbol: string, beforeTimestamp?: number): Promise<number> {
    if (beforeTimestamp) {
      const timestamp = new Date(beforeTimestamp * 1000);
      return await getModelForClass(Price).count({symbol, timestamp: {$lt: timestamp}});
    } else {
      return await getModelForClass(Price).count({symbol});
    }
  }
}
