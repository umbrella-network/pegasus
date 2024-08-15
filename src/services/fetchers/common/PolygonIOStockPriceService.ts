import {inject, injectable} from 'inversify';
import schedule, {Job} from 'node-schedule';
import {Logger} from 'winston';

import {PolygonIOStockSnapshotFetcher} from '../PolygonIOStockSnapshotFetcher.js';
import {PolygonIOSingleStockPriceFetcher} from '../PolygonIOSingleStockPriceFetcher.js';
import {SinglePriceResponse} from './BasePolygonIOSingleFetcher.js';
import {SnapshotResponse} from './BasePolygonIOSnapshotFetcher.js';
import PriceAggregator from '../../PriceAggregator.js';
import Settings from '../../../types/Settings.js';
import TimeService from '../../TimeService.js';

@injectable()
class PolygonIOStockPriceService {
  @inject('Logger') logger!: Logger;
  @inject(PolygonIOStockSnapshotFetcher) polygonIOSnapshotFetcher!: PolygonIOStockSnapshotFetcher;
  @inject(PolygonIOSingleStockPriceFetcher) polygonIOSingleStockPriceFetcher!: PolygonIOSingleStockPriceFetcher;
  @inject('Settings') settings!: Settings;
  @inject(TimeService) timeService!: TimeService;
  @inject(PriceAggregator) priceAggregator!: PriceAggregator;

  static readonly Prefix = 'pios::';
  loggerPrefix = '[PolygonIOStockPriceService]';

  priceUpdateJob?: Job;
  truncateJob?: Job;

  subscriptions = {} as {[symbol: string]: boolean};

  async getLatestPrice(sym: string, timestamp: number): Promise<number | null> {
    return await this.priceAggregator.value(`${PolygonIOStockPriceService.Prefix}${sym}`, timestamp);
  }

  start(): void {
    this.truncateJob = schedule.scheduleJob(this.settings.api.polygonIO.truncateCronRule, () => {
      this.truncatePriceAggregator().catch(this.logger.warn);
    });

    this.priceUpdateJob = schedule.scheduleJob(this.settings.api.polygonIO.priceUpdateCronRule, () => {
      this.requestAllPrices(Object.keys(this.subscriptions)).catch(this.logger.warn);
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

    this.logger.debug(`${symbol}: ${price} at ${timestamp}`);

    this.priceAggregator
      .add(`${PolygonIOStockPriceService.Prefix}${symbol}`, price, timestamp)
      .catch(this.logger.error);
  }

  subscribe(...symbols: string[]): void {
    const newSymbols = symbols.filter((symbol) => this.subscriptions[symbol] === undefined);

    for (const newSymbol of newSymbols) {
      this.subscriptions[newSymbol] = false;
    }

    this.updateInitialPrices().catch(console.warn);
  }

  unsubscribe(...symbols: string[]): void {
    for (const symbol of symbols) {
      delete this.subscriptions[symbol];
    }
  }

  private async updateInitialPrices(): Promise<void> {
    const initialSymbols = Object.entries(this.subscriptions)
      .filter(([, initialized]) => !initialized)
      .map(([symbol]) => symbol);

    if (!initialSymbols.length) {
      return;
    }

    this.logger.info(`${this.loggerPrefix} updating ${initialSymbols.length} initial stock prices`);

    const results = await Promise.allSettled(
      initialSymbols.map((sym) => this.polygonIOSingleStockPriceFetcher.apply({sym}, true)),
    );

    const fulfilled: SinglePriceResponse[] = results
      .filter(({status}) => status === 'fulfilled')
      // eslint-disable-next-line
      .map(({value}: any) => value);

    fulfilled.forEach(({last, symbol}) => {
      this.subscriptions[symbol] = true;

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

  private async requestAllPrices(symbols: string[]): Promise<void> {
    if (!symbols.length) {
      this.logger.debug(`${this.loggerPrefix} no stock prices to update`);
      return;
    }

    this.logger.info(`${this.loggerPrefix} updating all ${symbols.length} stock prices`);

    const result = (await this.polygonIOSnapshotFetcher.apply({symbols}, true)) as SnapshotResponse;

    result.tickers.forEach(({lastTrade, ticker: symbol}) => {
      if (!lastTrade) {
        console.warn(`no lastTrade for ${symbol}`);
        return;
      }

      const {p: price, t: timestamp} = lastTrade;
      this.onUpdate(symbol, price, Math.floor(timestamp / 1000000000));
    });
  }

  private async truncatePriceAggregator(): Promise<void> {
    const beforeTimestamp = this.timeService.apply() - this.settings.api.polygonIO.truncateIntervalMinutes * 60;

    this.logger.info(`Truncating PolygonIO stock prices before ${beforeTimestamp}...`);

    await Promise.all(
      Object.keys(this.subscriptions).map(async (subscription) => {
        const key = `${PolygonIOStockPriceService.Prefix}${subscription}`;

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

  public async allPrices(sym: string): Promise<{value: number; timestamp: number}[]> {
    return this.priceAggregator.valueTimestamps(`${PolygonIOStockPriceService.Prefix}${sym}`);
  }

  public async latestPrices(
    symbols: string[],
    beforeTimestamp: number,
  ): Promise<{symbol: string; value: number; timestamp: number}[]> {
    return await Promise.all(
      symbols.map(async (sym) => {
        const valueTimestamp = await this.priceAggregator.valueTimestamp(
          `${PolygonIOStockPriceService.Prefix}${sym}`,
          beforeTimestamp,
        );

        const {value, timestamp} = valueTimestamp || {value: 0, timestamp: 0};
        return {
          symbol: `${sym}`,
          value,
          timestamp,
        };
      }),
    );
  }
}

export default PolygonIOStockPriceService;
