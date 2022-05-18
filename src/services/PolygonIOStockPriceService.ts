import {inject, injectable} from 'inversify';
import schedule, {Job} from 'node-schedule';
import {Logger} from 'winston';

import Settings from '../types/Settings';
import TimeService from './TimeService';
import StatsDClient from '../lib/StatsDClient';
import PolygonIOStockSnapshotFetcher, {SnapshotResponse} from './fetchers/PolygonIOStockSnapshotFetcher';
import PolygonIOSingleStockPriceFetcher, {SinglePriceResponse} from './fetchers/PolygonIOSingleStockPriceFetcher';
import {PriceRepository} from '../repositories/PriceRepository';

@injectable()
class PolygonIOStockPriceService {
  @inject('Logger') logger!: Logger;
  @inject(PolygonIOStockSnapshotFetcher) polygonIOSnapshotFetcher!: PolygonIOStockSnapshotFetcher;
  @inject(PolygonIOSingleStockPriceFetcher) polygonIOSingleStockPriceFetcher!: PolygonIOSingleStockPriceFetcher;
  @inject('Settings') settings!: Settings;
  @inject(TimeService) timeService!: TimeService;
  @inject(PriceRepository) priceRepository!: PriceRepository;

  static readonly Prefix = 'EQ:';

  static readonly Source = 'polygonIOStockPrice';

  priceUpdateJob?: Job;

  subscriptions = {} as {[symbol: string]: boolean};

  async getLatestPrice(sym: string, timestamp: number): Promise<number | undefined> {
    return this.priceRepository.getLatestPrice({
      symbol: `${PolygonIOStockPriceService.Prefix}${sym}`,
      source: PolygonIOStockPriceService.Source,
      timestamp: {
        to: new Date(timestamp * 1000),
      },
    });
  }

  start(): void {
    this.priceUpdateJob = schedule.scheduleJob(this.settings.api.polygonIO.priceUpdateCronRule, () => {
      this.requestAllPrices(Object.keys(this.subscriptions)).catch(this.logger.warn);
    });
  }

  stop(): void {
    this.priceUpdateJob?.cancel();
  }

  onUpdate(symbol: string, price: number, timestamp: number): void {
    if (!price || !timestamp) {
      return;
    }

    StatsDClient?.gauge(`cpm.${symbol}`, price);
    this.logger.debug(`${symbol}: ${price} at ${timestamp}`);

    this.priceRepository
      .saveBatch([
        {
          symbol: `${PolygonIOStockPriceService.Prefix}${symbol}`,
          source: PolygonIOStockPriceService.Source,
          value: price,
          timestamp: new Date(timestamp * 1000),
        },
      ])
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

    this.logger.info(`[PolygonIOStockPriceService] updating ${initialSymbols.length} initial stock prices...`);

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
        console.warn(`[PolygonIOStockPriceService] no last for ${symbol}`);
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
    this.logger.info(`[PolygonIOStockPriceService] updating all ${symbols.length} stock prices...`);

    if (!symbols.length) {
      return;
    }

    const result = (await this.polygonIOSnapshotFetcher.apply({symbols}, true)) as SnapshotResponse;

    result.tickers.forEach(({lastTrade, ticker: symbol}) => {
      if (!lastTrade) {
        console.warn(`[PolygonIOStockPriceService] no lastTrade for ${symbol}`);
        return;
      }

      const {p: price, t: timestamp} = lastTrade;
      this.onUpdate(symbol, price, Math.floor(timestamp / 1000000000));
    });
  }

  public async allPrices(sym: string): Promise<{value: number; timestamp: number}[]> {
    return this.priceRepository.getValueTimestamps(sym, PolygonIOStockPriceService.Source);
  }

  public async latestPrices(
    symbols: string[],
    beforeTimestamp: number,
  ): Promise<{symbol: string; value: number; timestamp: number}[]> {
    return Promise.all(
      symbols.map(async (sym) => {
        const valueTimestamp = await this.priceRepository.getValueAndTimestamp({
          source: PolygonIOStockPriceService.Source,
          symbol: `${PolygonIOStockPriceService.Prefix}${sym}`,
          timestamp: {
            to: new Date(beforeTimestamp * 1000),
          },
        });

        const {value, timestamp} = valueTimestamp || {value: 0, timestamp: 0};
        return {
          symbol: `${PolygonIOStockPriceService.Prefix}${sym}`,
          value,
          timestamp,
        };
      }),
    );
  }
}

export default PolygonIOStockPriceService;
