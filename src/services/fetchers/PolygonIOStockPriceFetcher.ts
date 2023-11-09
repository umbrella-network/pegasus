import {inject, injectable} from 'inversify';

import PolygonIOStockPriceService from '../PolygonIOStockPriceService.js';

@injectable()
class PolygonIOPriceFetcher {
  @inject(PolygonIOStockPriceService) polygonIOStockPriceService!: PolygonIOStockPriceService;

  async apply({sym}: {sym: string}, timestamp: number): Promise<number> {
    const price = await this.polygonIOStockPriceService.getLatestPrice(sym, timestamp);
    if (price !== null) {
      return price;
    }

    throw new Error(`NO price for ${sym}`);
  }
}

export default PolygonIOPriceFetcher;
