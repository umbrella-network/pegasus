import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import PolygonIOCryptoPriceService from '../PolygonIOCryptoPriceService.js';
import {FeedFetcherOptions, FetcherName, NumberOrUndefined} from '../../types/fetchers.js';

@injectable()
class PolygonIOCryptoPriceFetcher {
  @inject(PolygonIOCryptoPriceService) polygonIOCryptoPriceService!: PolygonIOCryptoPriceService;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.PolygonIOCryptoPrice}]`;
  static fetcherSource = '';

  async apply(params: {fsym: string; tsym: string}, options: FeedFetcherOptions): Promise<NumberOrUndefined> {
    const {fsym, tsym} = params;
    const {base: feedBase, quote: feedQuote, timestamp} = options;
    this.logger.debug(`${this.logPrefix} call for ${feedBase}-${feedQuote}: ${fsym}, ${tsym}`);

    if (!timestamp || timestamp <= 0) throw new Error(`${this.logPrefix} invalid timestamp value: ${timestamp}`);

    const price = await this.polygonIOCryptoPriceService.getLatestPrice({fsym, tsym}, timestamp);

    if (!price) {
      this.logger.error(`${this.logPrefix} NO price for ${fsym}-${tsym}`);
      return;
    }

    await this.priceDataRepository.saveFetcherResults(
      {prices: [price]},
      [`${feedBase}-${feedQuote}`],
      FetcherName.PolygonIOCryptoPrice,
      PriceValueType.Price,
      PolygonIOCryptoPriceFetcher.fetcherSource,
    );

    return price;
  }
}

export default PolygonIOCryptoPriceFetcher;
