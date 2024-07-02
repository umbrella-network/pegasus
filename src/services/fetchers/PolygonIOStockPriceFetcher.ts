import {inject, injectable} from 'inversify';

import PolygonIOStockPriceService from '../PolygonIOStockPriceService.js';
import {FeedFetcherInterface, FeedBaseQuote} from '../../types/fetchers.js';

@injectable()
class PolygonIOPriceFetcher implements FeedFetcherInterface {
  @inject(PolygonIOStockPriceService) polygonIOStockPriceService!: PolygonIOStockPriceService;

  async apply(params: {sym: string} & FeedBaseQuote, timestamp: number): Promise<number> {
    const price = await this.polygonIOStockPriceService.getLatestPrice(params.sym, timestamp);

    if (price !== null) {
      return price;
    }

    throw new Error(`[PolygonIOPriceFetcher] NO price for ${params.sym}`);
  }
}

export default PolygonIOPriceFetcher;
