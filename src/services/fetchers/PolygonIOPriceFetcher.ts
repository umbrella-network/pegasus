import {inject, injectable} from 'inversify';

import PolygonIOPriceService from '../PolygonIOPriceService';

@injectable()
class PolygonIOPriceFetcher {
  @inject(PolygonIOPriceService) polygonIOPriceService!: PolygonIOPriceService;

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
  async apply({sym}: any, timestamp: number): Promise<number> {
    const price = await this.polygonIOPriceService.getLatestPrice(sym, timestamp);
    if (price !== null) {
      return price;
    }

    throw new Error(`NO price for ${sym}`);
  }
}

export default PolygonIOPriceFetcher;
