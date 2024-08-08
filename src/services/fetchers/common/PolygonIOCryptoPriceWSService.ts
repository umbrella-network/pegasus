import {inject, injectable} from 'inversify';
import schedule, {Job} from 'node-schedule';
import {Logger} from 'winston';

import PriceAggregator from '../../PriceAggregator.js';
import Settings from '../../../types/Settings.js';
import TimeService from '../../TimeService.js';

@injectable()
class PolygonIOCryptoPriceWSService {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(TimeService) timeService!: TimeService;
  @inject(PriceAggregator) priceAggregator!: PriceAggregator;

  private loggerPrefix = '[PolygonIOCryptoPriceWSService]';

  truncateJob?: Job;

  subscriptions: Record<string, boolean> = {};

  async getLatestPrice(symbol: string, timestamp: number): Promise<number | null> {
    return await this.priceAggregator.value(symbol, timestamp);
  }

  start(): void {
    this.truncateJob = schedule.scheduleJob(this.settings.api.polygonIO.truncateCronRule, () => {
      this.truncatePriceAggregator().catch(this.logger.warn);
    });
  }

  stop(): void {
    this.truncateJob?.cancel();
  }

  onUpdate(symbol: string, price: number, timestamp: number): void {
    if (!price || !timestamp) {
      return;
    }

    this.logger.debug(`${this.loggerPrefix} ${symbol}: ${price} at ${timestamp}`);

    this.priceAggregator
      .add(symbol, price, timestamp)
      .catch(this.logger.error);
  }

  subscribe(...symbols: string[]): void {
    for (const symbol of symbols) {
      this.subscriptions[symbol] = true;
    }
  }

  unsubscribe(...pairs: string[]): void {
    for (const symbol of pairs) {
      delete this.subscriptions[symbol];
    }
  }

  private async truncatePriceAggregator(): Promise<void> {
    const beforeTimestamp = this.timeService.apply() - this.settings.api.polygonIO.truncateIntervalMinutes * 60;

    this.logger.info(`${this.loggerPrefix} Truncating crypto prices before ${beforeTimestamp}`);

    await Promise.all(
      Object.keys(this.subscriptions).map(async (key) => {
        // find a value before a particular timestamp
        const valueTimestamp = await this.priceAggregator.valueTimestamp(key, beforeTimestamp);

        if (!valueTimestamp) {
          // no values to truncate
          return;
        }

        // delete all values before the one we have just found
        await this.priceAggregator.cleanUp(key, valueTimestamp.timestamp);
      }),
    );
  }

  public async allPrices(symbol: string): Promise<{value: number; timestamp: number}[]> {
    return this.priceAggregator.valueTimestamps(symbol);
  }

  public async latestPrices(
    pairs: string[],
    beforeTimestamp: number,
  ): Promise<{symbol: string; value: number; timestamp: number}[]> {
    return await Promise.all(
      pairs.map(async (symbol) => {
        const valueTimestamp = await this.priceAggregator.valueTimestamp(
          symbol,
          beforeTimestamp,
        );

        const {value, timestamp} = valueTimestamp || {value: 0, timestamp: 0};

        return {
          symbol,
          value,
          timestamp,
        };
      }),
    );
  }
}

export default PolygonIOCryptoPriceWSService;
