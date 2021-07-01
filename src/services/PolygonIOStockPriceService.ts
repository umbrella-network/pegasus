import {inject, injectable} from 'inversify';
import schedule, {Job} from 'node-schedule';
import {Logger} from 'winston';

import PriceAggregator from './PriceAggregator';
import Settings from '../types/Settings';
import TimeService from './TimeService';
import StatsDClient from '../lib/StatsDClient';
import PolygonIOStockSnapshotFetcher, {SnapshotResponse} from './fetchers/PolygonIOStockSnapshotFetcher';
import PolygonIOSingleStockPriceFetcher, {SinglePriceResponse} from './fetchers/PolygonIOSingleStockPriceFetcher';

@injectable()
class PolygonIOStockPriceService {
  @inject('Logger') logger!: Logger;
  @inject(PolygonIOStockSnapshotFetcher) polygonIOSnapshotFetcher!: PolygonIOStockSnapshotFetcher;
  @inject(PolygonIOSingleStockPriceFetcher) polygonIOSingleStockPriceFetcher!: PolygonIOSingleStockPriceFetcher;
  @inject('Settings') settings!: Settings;
  @inject(TimeService) timeService!: TimeService;
  @inject(PriceAggregator) priceAggregator!: PriceAggregator;

  static readonly Prefix = 'pios::';

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

    StatsDClient?.gauge(`cpm.${symbol}`, price);
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

    this.logger.info(`updating ${initialSymbols.length} initial prices...`);

    const results = await Promise.allSettled(
      initialSymbols.map((sym) => this.polygonIOSingleStockPriceFetcher.apply({sym}, true)),
    );

    const fulfilled: SinglePriceResponse[] = results
      .filter(({status}) => status === 'fulfilled')
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
    this.logger.info(`updating all ${symbols.length} prices...`);

    if (!symbols.length) {
      return;
    }

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

    this.logger.info(`Truncating PolygonIO prices before ${beforeTimestamp}...`);

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
}

export default PolygonIOStockPriceService;
