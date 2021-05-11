import {inject, injectable} from 'inversify';

import PolygonIOPriceService from '../PolygonIOPriceService';

@injectable()
class PolygonIOPriceFetcher {
  @inject(PolygonIOPriceService) polygonIOPriceService!: PolygonIOPriceService;

  async apply({sym}: any, timestamp: number): Promise<number> {
    const price = await this.polygonIOPriceService.getLatestPrice(sym, timestamp);
    if (price !== null) {
      return price;
    }

    throw new Error(`NO price for ${sym}`);
  }
}

export default PolygonIOPriceFetcher;
