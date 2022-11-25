import {inject, injectable} from 'inversify';

import {UniswapPoolPrice} from './UniswapPriceScanner';
import {PriceRepository} from '../../repositories/PriceRepository';

@injectable()
export class UniswapPriceService {
  @inject(PriceRepository) priceRepository!: PriceRepository;

  static readonly SOURCE = 'uniswapv3';

  async savePrices(prices: UniswapPoolPrice[]): Promise<void> {
    await this.priceRepository.saveBatch(
      prices.map((p) => ({
        source: UniswapPriceService.SOURCE,
        symbol: p.symbol.toUpperCase(),
        value: p.value,
        timestamp: new Date(p.timestamp * 1000),
      })),
    );
  }

  async getLatestPrice(symbol: string, from: number, to: number): Promise<number | undefined> {
    return await this.priceRepository.getLatestPrice({
      source: UniswapPriceService.SOURCE,
      symbol: symbol.toUpperCase(),
      timestamp: {from: new Date(from * 1000), to: new Date(to * 1000)},
    });
  }
}
