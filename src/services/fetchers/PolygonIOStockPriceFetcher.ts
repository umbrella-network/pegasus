import {inject, injectable} from 'inversify';

import PolygonIOStockPriceService from '../PolygonIOStockPriceService.js';
import {FeedFetcherInterface, FeedFetcherOptions} from '../../types/fetchers.js';

@injectable()
class PolygonIOPriceFetcher implements FeedFetcherInterface {
  @inject(PolygonIOStockPriceService) polygonIOStockPriceService!: PolygonIOStockPriceService;

  async apply(params: {sym: string}, options: FeedFetcherOptions): Promise<number> {
    const {timestamp} = options;

    if (!timestamp || timestamp <= 0) throw new Error(`invalid timestamp value: ${timestamp}`);

    // TODO: refactor getLatestPrice to avoid having a timestamp as argument
    const price = await this.polygonIOStockPriceService.getLatestPrice(params.sym, timestamp);

    if (price !== null) {
      return price;
    }

    throw new Error(`[PolygonIOPriceFetcher] NO price for ${params.sym}`);
  }
}

export default PolygonIOPriceFetcher;
