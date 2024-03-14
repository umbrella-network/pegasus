import {inject, injectable} from 'inversify';

import PolygonIOCryptoPriceService from '../PolygonIOCryptoPriceService.js';

@injectable()
class PolygonIOCryptoPriceFetcher {
  @inject(PolygonIOCryptoPriceService) polygonIOCryptoPriceService!: PolygonIOCryptoPriceService;

  async apply({fsym, tsym}: {fsym: string; tsym: string}, timestamp: number): Promise<number> {
    const price = await this.polygonIOCryptoPriceService.getLatestPrice({fsym, tsym}, timestamp);
    if (price !== null) {
      return price;
    }

    throw new Error(`[PolygonIOCryptoPriceFetcher] NO price for ${fsym}-${tsym}`);
  }
}

export default PolygonIOCryptoPriceFetcher;
