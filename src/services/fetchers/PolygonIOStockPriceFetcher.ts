import {inject, injectable} from 'inversify';

import PolygonIOStockPriceService from './common/PolygonIOStockPriceService.js';
import {FeedFetcherInterface, FeedFetcherOptions, FetcherName, FetcherResult} from '../../types/fetchers.js';

export interface PolygonIOStockPriceInputParams {
  sym: string;
}

@injectable()
export class PolygonIOStockPriceFetcher implements FeedFetcherInterface {
  @inject(PolygonIOStockPriceService) polygonIOStockPriceService!: PolygonIOStockPriceService;

  private logPrefix = `[${FetcherName.PolygonIOStockPrice}]`;

  async apply(params: PolygonIOStockPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length != 1) throw new Error(`${this.logPrefix} not a multifetcher: ${params}`);

    const {timestamp} = options;

    if (!timestamp || timestamp <= 0) throw new Error(`invalid timestamp value: ${timestamp}`);

    // TODO: refactor getLatestPrice to avoid having a timestamp as argument
    const price = await this.polygonIOStockPriceService.getLatestPrice(params[0].sym, timestamp);

    if (price !== null) {
      return {prices: [price]};
    }

    throw new Error(`[PolygonIOPriceFetcher] NO price for ${params[0].sym}`);
  }
}
