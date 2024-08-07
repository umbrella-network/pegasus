import {inject, injectable} from 'inversify';
import schedule, {Job} from 'node-schedule';
import {Logger} from 'winston';

import PriceAggregator from '../../PriceAggregator.js';
import Settings from '../../../types/Settings.js';
import TimeService from '../../TimeService.js';
import {SnapshotResponse} from './BasePolygonIOSnapshotFetcher.js';

@injectable()
class PolygonIOCryptoPriceSubscriptionService {
  @inject('Logger') logger!: Logger;
  @inject('Settings') settings!: Settings;
  @inject(TimeService) timeService!: TimeService;
  @inject(PriceAggregator) priceAggregator!: PriceAggregator;

  static readonly Prefix = 'pioc::';
  private loggerPrefix = '[PolygonIOCryptoPriceSubscriptionService]';

  priceUpdateJob?: Job;
  truncateJob?: Job;

  subscriptions: Record<string, boolean> = {};

  async getLatestPrice(symbol: string, timestamp: number): Promise<number | null> {
    return await this.priceAggregator.value(symbol, timestamp);
  }

  start(): void {
    this.truncateJob = schedule.scheduleJob(this.settings.api.polygonIO.truncateCronRule, () => {
      this.truncatePriceAggregator().catch(this.logger.warn);
    });

    this.priceUpdateJob = schedule.scheduleJob(this.settings.api.polygonIO.priceUpdateCronRule, () => {
      this.requestAllPrices(Object.keys(this.subscriptions).map((symbol) => symbol)).catch(this.logger.warn);
    });
  }

  stop(): void {
    this.truncateJob?.cancel();
    this.priceUpdateJob?.cancel();
  }

  onUpdate(symbol: string, price: number, timestamp: number): void {
    if (!price || !timestamp) {
      return;
    }

    this.logger.debug(`${this.loggerPrefix} ${symbol}: ${price} at ${timestamp}`);

    this.priceAggregator
      .add(`${PolygonIOCryptoPriceSubscriptionService.Prefix}${symbol}`, price, timestamp)
      .catch(this.logger.error);
  }

  subscribe(...symbols: string[]): void {
    const newPairs = symbols.filter((symbol) => this.subscriptions[symbol] === undefined);

    for (const symbol of newPairs) {
      this.subscriptions[symbol] = [symbol, false];
    }

    this.updateInitialPrices().catch(console.warn);
  }

  unsubscribe(...pairs: string[]): void {
    for (const symbol of pairs) {
      delete this.subscriptions[symbol];
    }
  }

  private async requestAllPrices(pairs: Pair[]): Promise<void> {
    if (!pairs.length) {
      this.logger.debug(`${this.loggerPrefix} no crypto prices to update`);
      return;
    }

    this.logger.info(`${this.loggerPrefix} updating all ${pairs.length} crypto prices`);

    const symbols: {[key: string]: string} = {};
    pairs.forEach(({symbol, tsym}) => {
      symbols[`X:${symbol}${tsym}`] = `${symbol}-${tsym}`;
    });

    const result = (await this.polygonIOCryptoSnapshotFetcher.apply(
      {symbols: Object.keys(symbols)},
      true,
    )) as SnapshotResponse;

    result.tickers.forEach(({lastTrade, ticker: symbol}) => {
      symbol = symbols[symbol];
      if (!lastTrade) {
        this.logger.warn(`${this.loggerPrefix} no lastTrade for ${symbol}`);
        return;
      }

      const {p: price, t: timestamp} = lastTrade;
      this.onUpdate(symbol, price, Math.floor(timestamp / 1000));
    });
  }

  private async truncatePriceAggregator(): Promise<void> {
    const beforeTimestamp = this.timeService.apply() - this.settings.api.polygonIO.truncateIntervalMinutes * 60;

    this.logger.info(`${this.loggerPrefix} Truncating crypto prices before ${beforeTimestamp}`);

    await Promise.all(
      Object.keys(this.subscriptions).map(async (subscription) => {
        const key = `${PolygonIOCryptoPriceSubscriptionService.Prefix}${subscription}`;

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

  public async allPrices({symbol, tsym}: Pair): Promise<{value: number; timestamp: number}[]> {
    return this.priceAggregator.valueTimestamps(`${PolygonIOCryptoPriceSubscriptionService.Prefix}${symbol}-${tsym}`);
  }

  public async latestPrices(
    pairs: Pair[],
    beforeTimestamp: number,
  ): Promise<{symbol: string; value: number; timestamp: number}[]> {
    return await Promise.all(
      pairs.map(async ({symbol, tsym}) => {
        const valueTimestamp = await this.priceAggregator.valueTimestamp(
          `${PolygonIOCryptoPriceSubscriptionService.Prefix}${symbol}-${tsym}`,
          beforeTimestamp,
        );

        const {value, timestamp} = valueTimestamp || {value: 0, timestamp: 0};
        return {
          symbol: `${symbol}-${tsym}`,
          value,
          timestamp,
        };
      }),
    );
  }
}

export default PolygonIOCryptoPriceSubscriptionService;
