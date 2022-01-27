import {inject, injectable} from 'inversify';
import PriceAggregator from '../PriceAggregator';
import {UniswapPoolPrice} from './UniswapPriceScanner';

@injectable()
export class UniswapPriceService {
  @inject(PriceAggregator) priceAggregator!: PriceAggregator;

  async savePrices(prices: UniswapPoolPrice[]): Promise<void> {
    for (const price of prices) {
      await this.priceAggregator.add(this.getPriceId(price.symbol), price.value, price.timestamp);
    }
  }

  async getLatestPrice(symbol: string, from: number, to: number): Promise<number | undefined> {
    const latestPrice = await this.priceAggregator.valueAfter(this.getPriceId(symbol), to, from);
    return latestPrice == null ? undefined : latestPrice;
  }

  getPriceId(symbol: string): string {
    return `uniswap::${symbol}`;
  }
}
