import {inject, injectable} from 'inversify';

import PolygonIOCryptoPriceService from '../PolygonIOCryptoPriceService.js';
import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import {FeedBaseQuote, FetcherName} from '../../types/fetchers.js';

@injectable()
class PolygonIOCryptoPriceFetcher {
  @inject(PolygonIOCryptoPriceService) polygonIOCryptoPriceService!: PolygonIOCryptoPriceService;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;

  static fetcherSource = '';

  async apply(params: {fsym: string; tsym: string} & FeedBaseQuote, timestamp: number): Promise<number> {
    const {fsym, tsym, feedBase, feedQuote} = params;

    const price = await this.polygonIOCryptoPriceService.getLatestPrice({fsym, tsym}, timestamp);

    if (price !== null) {
      const payload: PriceDataPayload = {
        fetcher: FetcherName.POLYGON_IO_CRYPTO_PRICE,
        value: price.toString(),
        valueType: PriceValueType.Price,
        timestamp: this.timeService.apply(),
        feedBase,
        feedQuote,
        fetcherSource: PolygonIOCryptoPriceFetcher.fetcherSource,
      };

      await this.priceDataRepository.savePrice(payload);

      return price;
    }

    throw new Error(`[PolygonIOCryptoPriceFetcher] NO price for ${fsym}-${tsym}`);
  }
}

export default PolygonIOCryptoPriceFetcher;
