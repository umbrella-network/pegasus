import {inject, injectable} from 'inversify';

import PolygonIOStockPriceService from '../PolygonIOStockPriceService.js';
import {FeedFetcherInterface} from '../../types/fetchers.js';

@injectable()
class PolygonIOPriceFetcher implements FeedFetcherInterface {
  @inject(PolygonIOStockPriceService) polygonIOStockPriceService!: PolygonIOStockPriceService;

  async apply({sym}: {sym: string}, _symbol: string, timestamp: number): Promise<number> {
    const price = await this.polygonIOStockPriceService.getLatestPrice(sym, timestamp);

    if (price !== null) {
      return price;
    }

    throw new Error(`[PolygonIOPriceFetcher] NO price for ${sym}`);
  }
}

export default PolygonIOPriceFetcher;
