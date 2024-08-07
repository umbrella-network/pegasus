import {inject, injectable} from 'inversify';
import MongoDBPriceAggregator from './MongoDBPriceAggregator.js';

@injectable()
export default class PriceAggregator {
  @inject(MongoDBPriceAggregator) aggregator!: MongoDBPriceAggregator;

  async add(symbol: string, value: number, timestamp: number): Promise<void> {
    return this.aggregator.add(symbol, value, timestamp);
  }

  async value(symbol: string, beforeTimestamp: number): Promise<number | null> {
    return this.aggregator.value(symbol, beforeTimestamp);
  }

  async valueAfter(symbol: string, beforeTimestamp: number, afterTimestamp: number): Promise<number | null> {
    return this.aggregator.valueAfter(symbol, beforeTimestamp, afterTimestamp);
  }

  async valueTimestamp(symbol: string, beforeTimestamp: number): Promise<{value: number; timestamp: number} | null> {
    return this.aggregator.valueTimestamp(symbol, beforeTimestamp);
  }

  async valueTimestamps(symbol: string): Promise<{value: number; timestamp: number}[]> {
    return this.aggregator.valueTimestamps(symbol);
  }

  async cleanUp(symbol: string, beforeTimestamp?: number): Promise<number> {
    return this.aggregator.cleanUp(symbol, beforeTimestamp);
  }

  async count(symbol: string, beforeTimestamp?: number): Promise<number> {
    return this.aggregator.count(symbol, beforeTimestamp);
  }
}
