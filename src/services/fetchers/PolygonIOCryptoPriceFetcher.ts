import {inject, injectable} from 'inversify';

import PolygonIOCryptoPriceService from '../PolygonIOCryptoPriceService.js';
import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import {FetcherName} from '../../types/fetchers.js';
import FeedSymbolChecker from '../FeedSymbolChecker.js';

@injectable()
class PolygonIOCryptoPriceFetcher {
  @inject(PolygonIOCryptoPriceService) polygonIOCryptoPriceService!: PolygonIOCryptoPriceService;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(FeedSymbolChecker) private feedSymbolChecker!: FeedSymbolChecker;
  @inject(TimeService) private timeService!: TimeService;

  static fetcherSource = '';

  async apply({fsym, tsym}: {fsym: string; tsym: string}, symbol: string, timestamp: number): Promise<number> {
    const price = await this.polygonIOCryptoPriceService.getLatestPrice({fsym, tsym}, timestamp);

    const result = this.feedSymbolChecker.apply(symbol);

    if (!result) {
      throw new Error(`[PolygonIOCryptoPriceFetcher] Cannot extract base and quote from feed symbol: ${symbol}`);
    }

    const [feedBase, feedQuote] = result;

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
