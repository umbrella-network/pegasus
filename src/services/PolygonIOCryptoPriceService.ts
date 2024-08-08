import {inject, injectable} from 'inversify';
import schedule, {Job} from 'node-schedule';
import {Logger} from 'winston';

import PriceAggregator from './PriceAggregator.js';
import Settings from '../types/Settings.js';
import TimeService from './TimeService.js';
import {Pair} from '../types/Feed.js';

@injectable()
class PolygonIOCryptoPriceService {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(TimeService) timeService!: TimeService;
  @inject(PriceAggregator) priceAggregator!: PriceAggregator;

  static readonly Prefix = 'pioc::';
  private loggerPrefix = '[PolygonIOCryptoPriceService]';

  truncateJob?: Job;

  subscriptions: {[subscription: string]: [Pair, boolean]} = {};

  async getLatestPrice({fsym, tsym}: Pair, timestamp: number): Promise<number | null> {
    return await this.priceAggregator.value(`${PolygonIOCryptoPriceService.Prefix}${fsym}-${tsym}`, timestamp);
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
      .add(`${PolygonIOCryptoPriceService.Prefix}${symbol}`, price, timestamp)
      .catch(this.logger.error);
  }

  subscribe(...symbols: Pair[]): void {
    const newPairs = symbols.filter((pair) => this.subscriptions[`${pair.fsym}-${pair.tsym}`] === undefined);

    for (const pair of newPairs) {
      this.subscriptions[`${pair.fsym}-${pair.tsym}`] = [pair, false];
    }
  }

  unsubscribe(...pairs: Pair[]): void {
    for (const pair of pairs) {
      delete this.subscriptions[`${pair.fsym}-${pair.tsym}`];
    }
  }

  private async truncatePriceAggregator(): Promise<void> {
    const beforeTimestamp = this.timeService.apply() - this.settings.api.polygonIO.truncateIntervalMinutes * 60;

    this.logger.info(`${this.loggerPrefix} Truncating crypto prices before ${beforeTimestamp}`);

    await Promise.all(
      Object.keys(this.subscriptions).map(async (subscription) => {
        const key = `${PolygonIOCryptoPriceService.Prefix}${subscription}`;

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

  public async allPrices({fsym, tsym}: Pair): Promise<{value: number; timestamp: number}[]> {
    return this.priceAggregator.valueTimestamps(`${PolygonIOCryptoPriceService.Prefix}${fsym}-${tsym}`);
  }

  public async latestPrices(
    pairs: Pair[],
    beforeTimestamp: number,
  ): Promise<{symbol: string; value: number; timestamp: number}[]> {
    return await Promise.all(
      pairs.map(async ({fsym, tsym}) => {
        const valueTimestamp = await this.priceAggregator.valueTimestamp(
          `${PolygonIOCryptoPriceService.Prefix}${fsym}-${tsym}`,
          beforeTimestamp,
        );

        const {value, timestamp} = valueTimestamp || {value: 0, timestamp: 0};
        return {
          symbol: `${fsym}-${tsym}`,
          value,
          timestamp,
        };
      }),
    );
  }
}

export default PolygonIOCryptoPriceService;
