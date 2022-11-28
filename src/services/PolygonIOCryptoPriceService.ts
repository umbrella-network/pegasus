import {inject, injectable} from 'inversify';
import schedule, {Job} from 'node-schedule';
import {Logger} from 'winston';

import Settings from '../types/Settings';
import TimeService from './TimeService';
import StatsDClient from '../lib/StatsDClient';
import PolygonIOCryptoSnapshotFetcher, {SnapshotResponse} from './fetchers/PolygonIOCryptoSnapshotFetcher';
import PolygonIOSingleCryptoPriceFetcher, {SinglePriceResponse} from './fetchers/PolygonIOSingleCryptoPriceFetcher';
import {Pair} from '../types/Feed';
import {PriceRepository} from '../repositories/PriceRepository';

@injectable()
class PolygonIOCryptoPriceService {
  @inject('Logger') logger!: Logger;
  @inject(PolygonIOCryptoSnapshotFetcher) polygonIOCryptoSnapshotFetcher!: PolygonIOCryptoSnapshotFetcher;
  @inject(PolygonIOSingleCryptoPriceFetcher) polygonIOSingleCryptoPriceFetcher!: PolygonIOSingleCryptoPriceFetcher;
  @inject('Settings') settings!: Settings;
  @inject(TimeService) timeService!: TimeService;
  @inject(PriceRepository) priceRepository!: PriceRepository;

  static readonly Source = 'polygonCryptoPriceWS';

  priceUpdateJob?: Job;

  static readonly DefaultFreshness = 3600;

  subscriptions: {[subscription: string]: [Pair, boolean]} = {};

  async getLatestPrice(
    {fsym, tsym}: Pair,
    timestamp: number,
    freshness = PolygonIOCryptoPriceService.DefaultFreshness,
  ): Promise<number | undefined> {
    const afterTimestamp = timestamp - freshness;

    return this.priceRepository.getLatestPrice({
      source: PolygonIOCryptoPriceService.Source,
      symbol: `${fsym}-${tsym}`,
      timestamp: {
        from: new Date(afterTimestamp * 1000),
        to: new Date(timestamp * 1000),
      },
    });
  }

  start(): void {
    this.priceUpdateJob = schedule.scheduleJob(this.settings.api.polygonIO.priceUpdateCronRule, () => {
      this.requestAllPrices(Object.values(this.subscriptions).map(([pair]) => pair)).catch(this.logger.warn);
    });
  }

  stop(): void {
    this.priceUpdateJob?.cancel();
  }

  onUpdate(symbol: string, price: number, timestamp: number): void {
    if (!price || !timestamp) {
      return;
    }

    StatsDClient?.gauge(`pioc.${symbol}`, price);
    this.logger.debug(`${symbol}: ${price} at ${timestamp}`);

    this.priceRepository
      .saveBatch([
        {
          source: PolygonIOCryptoPriceService.Source,
          symbol,
          value: price,
          timestamp: new Date(timestamp * 1000),
        },
      ])
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
      return;
    }

    this.logger.info(`updating ${initialPairs.length} initial crypto prices...`);

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
    this.logger.info(`updating all ${pairs.length} crypto prices...`);

    if (!pairs.length) {
      return;
    }

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
        console.warn(`no lastTrade for ${symbol}`);
        return;
      }

      const {p: price, t: timestamp} = lastTrade;
      this.onUpdate(symbol, price, Math.floor(timestamp / 1000));
    });
  }

  public async allPrices({fsym, tsym}: Pair): Promise<{value: number; timestamp: number}[]> {
    return this.priceRepository.getSourcePrices(`${fsym}-${tsym}`, PolygonIOCryptoPriceService.Source);
  }

  public async latestPrices(
    pairs: Pair[],
    beforeTimestamp: number,
  ): Promise<{symbol: string; value: number; timestamp: number}[]> {
    return Promise.all(
      pairs.map(async ({fsym, tsym}) => {
        const valueTimestamp = await this.priceRepository.getValueAndTimestamp({
          symbol: `${fsym}-${tsym}`,
          source: PolygonIOCryptoPriceService.Source,
          timestamp: {
            to: new Date(beforeTimestamp * 1000),
          },
        });

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
