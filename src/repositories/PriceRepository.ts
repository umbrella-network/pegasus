import {inject, injectable} from 'inversify';
import Settings from '../types/Settings.js';

import PriceAggregator from '../services/PriceAggregator.js';
import {Pair, PairWithFreshness} from '../types/Feed.js';

@injectable()
class PriceRepository {
  @inject('Settings') settings!: Settings;
  priceAggregator: PriceAggregator;

  constructor(@inject(PriceAggregator) priceAggregator: PriceAggregator) {
    this.priceAggregator = priceAggregator;
  }

  async savePrice(prefix: string, pair: string, price: number, timestamp: number): Promise<void> {
    const formattedPair = pair.toUpperCase().replace('-', '~');

    return this.priceAggregator.add(`${prefix}${formattedPair}`, price, timestamp);
  }

  async getLatestPrice(
    prefix: string,
    {symbol, tsym, freshness = this.settings.api.priceFreshness}: PairWithFreshness,
    timestamp: number,
  ): Promise<number | null> {
    return this.priceAggregator.valueAfter(`${prefix}${symbol}~${tsym}`, timestamp, timestamp - freshness);
  }

  async getLatestPrices(
    prefix: string,
    pairs: Pair[],
    maxTimestamp: number,
  ): Promise<{symbol: string; value: number; timestamp: number}[]> {
    return Promise.all(
      pairs.map(async ({symbol, tsym}) => {
        const valueTimestamp = await this.priceAggregator.valueTimestamp(`${prefix}${symbol}~${tsym}`, maxTimestamp);
        const {value, timestamp} = valueTimestamp || {value: 0, timestamp: 0};
        return {
          symbol: `${symbol}-${tsym}`,
          value,
          timestamp,
        };
      }),
    );
  }

  async getAllPrices(prefix: string, pair: Pair): Promise<{value: number; timestamp: number}[]> {
    return this.priceAggregator.valueTimestamps(`${prefix}${pair.symbol}~${pair.tsym}`);
  }
}

export default PriceRepository;
