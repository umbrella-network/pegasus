import {inject, injectable} from 'inversify';

import {UniswapPoolPrice} from './UniswapPriceScanner';
import {MongoDBPriceRepository} from '../../repositories/MongoDBPriceRepository';

@injectable()
export class UniswapPriceService {
  @inject(MongoDBPriceRepository) priceRepository!: MongoDBPriceRepository;

  private readonly SOURCE = 'uniswapv3';

  async savePrices(prices: UniswapPoolPrice[]): Promise<void> {
    await this.priceRepository.saveBatch(
      prices.map((p) => ({
        source: this.SOURCE,
        symbol: p.symbol,
        value: p.value,
        timestamp: new Date(p.timestamp * 1000),
      })),
    );
  }

  async getLatestPrice(symbol: string, from: number, to: number): Promise<number | undefined> {
    return await this.priceRepository.getLatestPrice({
      source: this.SOURCE,
      symbol,
      timestamp: {from: new Date(from * 1000), to: new Date(to * 1000)},
    });
  }
}
