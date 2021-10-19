import {inject, injectable} from 'inversify';

import PriceAggregator from '../services/PriceAggregator';
import {Pair, PairWithFreshness} from '../types/Feed';

@injectable()
class PriceRepository {
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
    {fsym, tsym, freshness}: PairWithFreshness,
    timestamp: number,
  ): Promise<number | null> {
    return this.priceAggregator.valueAfter(`${prefix}${fsym}~${tsym}`, timestamp, timestamp - freshness);
  }

  async getLatestPrices(
    prefix: string,
    pairs: Pair[],
    maxTimestamp: number,
  ): Promise<{symbol: string; value: number; timestamp: number}[]> {
    return Promise.all(
      pairs.map(async ({fsym, tsym}) => {
        const valueTimestamp = await this.priceAggregator.valueTimestamp(`${prefix}${fsym}~${tsym}`, maxTimestamp);
        const {value, timestamp} = valueTimestamp || {value: 0, timestamp: 0};
        return {
          symbol: `${fsym}-${tsym}`,
          value,
          timestamp,
        };
      }),
    );
  }

  async getAllPrices(prefix: string, pair: Pair): Promise<{value: number; timestamp: number}[]> {
    return this.priceAggregator.valueTimestamps(`${prefix}${pair.fsym}~${pair.tsym}`);
  }
}

export default PriceRepository;
