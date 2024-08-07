import {inject, injectable} from 'inversify';
import schedule, {Job} from 'node-schedule';
import {Logger} from 'winston';

import PriceAggregator from './PriceAggregator.js';
import Settings from '../types/Settings.js';
import TimeService from './TimeService.js';
import {PolygonIOCryptoSnapshotFetcher} from './fetchers/PolygonIOCryptoSnapshotFetcher.js';
import PolygonIOSingleCryptoPriceFetcher from './fetchers/PolygonIOSingleCryptoPriceFetcher.js';
import {Pair} from '../types/Feed.js';
import {SinglePriceResponse} from './fetchers/BasePolygonIOSingleFetcher.js';
import {SnapshotResponse} from './fetchers/BasePolygonIOSnapshotFetcher.js';

@injectable()
class PolygonIOCryptoPriceService {
  @inject('Logger') logger!: Logger;
  @inject(PolygonIOCryptoSnapshotFetcher) polygonIOCryptoSnapshotFetcher!: PolygonIOCryptoSnapshotFetcher;
  @inject(PolygonIOSingleCryptoPriceFetcher) polygonIOSingleCryptoPriceFetcher!: PolygonIOSingleCryptoPriceFetcher;
  @inject('Settings') settings!: Settings;
  @inject(TimeService) timeService!: TimeService;
  @inject(PriceAggregator) priceAggregator!: PriceAggregator;

  static readonly Prefix = 'pioc::';
  private loggerPrefix = '[PolygonIOCryptoPriceService]';

  priceUpdateJob?: Job;
  truncateJob?: Job;

  subscriptions: {[subscription: string]: [Pair, boolean]} = {};

  async getLatestPrice({fsym, tsym}: Pair, timestamp: number): Promise<number | null> {
    return await this.priceAggregator.value(`${PolygonIOCryptoPriceService.Prefix}${fsym}-${tsym}`, timestamp);
  }

  start(): void {
    this.truncateJob = schedule.scheduleJob(this.settings.api.polygonIO.truncateCronRule, () => {
      this.truncatePriceAggregator().catch(this.logger.warn);
    });

    this.priceUpdateJob = schedule.scheduleJob(this.settings.api.polygonIO.priceUpdateCronRule, () => {
      this.requestAllPrices(Object.values(this.subscriptions).map(([pair]) => pair)).catch(this.logger.warn);
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
      .add(`${PolygonIOCryptoPriceService.Prefix}${symbol}`, price, timestamp)
      .catch(this.logger.error);
  }

  subscribe(...symbols: Pair[]): void {
    const newPairs = symbols.filter((pair) => this.subscriptions[`${pair.fsym}-${pair.tsym}`] === undefined);

    for (const pair of newPairs) {
      this.subscriptions[`${pair.fsym}-${pair.tsym}`] = [pair, false];
    }

    this.updateInitialPrices().catch(console.warn);
  }

  unsubscribe(...pairs: Pair[]): void {
    for (const pair of pairs) {
      delete this.subscriptions[`${pair.fsym}-${pair.tsym}`];
    }
  }

  private async updateInitialPrices(): Promise<void> {
    const initialPairs = Object.entries(this.subscriptions)
      .filter(([, [, initialized]]) => !initialized)
      .map(([, [pair]]) => pair);

    if (!initialPairs.length) {
      this.logger.debug(`${this.loggerPrefix} no initial crypto prices to update`);
      return;
    }

    this.logger.info(`${this.loggerPrefix} updating ${initialPairs.length} initial crypto prices`);

    const results = await Promise.allSettled(
      initialPairs.map((pair) => this.polygonIOSingleCryptoPriceFetcher.apply(pair, true)),
    );

    const fulfilled: SinglePriceResponse[] = results
      .filter(({status}) => status === 'fulfilled')
      // eslint-disable-next-line
      .map(({value}: any) => value);

    fulfilled.forEach(({last, symbol}) => {
      this.subscriptions[symbol] = [this.subscriptions[symbol][0], true];

      if (!last) {
        console.warn(`no last for ${symbol}`);
        return;
      }

      const {price, timestamp} = last;

      this.onUpdate(symbol, price, Math.floor(timestamp / 1000));
    });

    const rejected = results.filter(({status}) => status === 'rejected');
    if (rejected.length) {
      this.updateInitialPrices().catch(console.warn);
    }
  }

  private async requestAllPrices(pairs: Pair[]): Promise<void> {
    if (!pairs.length) {
      this.logger.debug(`${this.loggerPrefix} no crypto prices to update`);
      return;
    }

    this.logger.info(`${this.loggerPrefix} updating all ${pairs.length} crypto prices`);

    const symbols: {[key: string]: string} = {};
    pairs.forEach(({fsym, tsym}) => {
      symbols[`X:${fsym}${tsym}`] = `${fsym}-${tsym}`;
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
