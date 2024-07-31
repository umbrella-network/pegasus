import {inject, injectable} from 'inversify';

import PolygonIOStockPriceService from '../PolygonIOStockPriceService.js';
import {FeedFetcherInterface, FeedFetcherOptions, FetcherResult} from '../../types/fetchers.js';

export interface PolygonIOPriceInputParams {
  sym: string;
}

@injectable()
export default class PolygonIOPriceFetcher implements FeedFetcherInterface {
  @inject(PolygonIOStockPriceService) polygonIOStockPriceService!: PolygonIOStockPriceService;

  async apply(params: PolygonIOPriceInputParams, options: FeedFetcherOptions): Promise<FetcherResult> {
    const {timestamp} = options;

    if (!timestamp || timestamp <= 0) throw new Error(`invalid timestamp value: ${timestamp}`);

    // TODO: refactor getLatestPrice to avoid having a timestamp as argument
    const price = await this.polygonIOStockPriceService.getLatestPrice(params.sym, timestamp);

    if (price !== null) {
      return {prices: [price]};
    }

    throw new Error(`[PolygonIOPriceFetcher] NO price for ${params.sym}`);
  }
}
