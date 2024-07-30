import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository, PriceValueType} from '../../repositories/PriceDataRepository.js';
import PolygonIOCryptoPriceService from '../PolygonIOCryptoPriceService.js';

import {FeedFetcherInterface, FeedFetcherOptions, FetcherName, FetcherResult} from '../../types/fetchers.js';

@injectable()
export default class PolygonIOCryptoPriceFetcher implements FeedFetcherInterface {
  @inject(PolygonIOCryptoPriceService) polygonIOCryptoPriceService!: PolygonIOCryptoPriceService;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.PolygonIOCryptoPrice}]`;
  static fetcherSource = '';

  async apply(params: {fsym: string; tsym: string}, options: FeedFetcherOptions): Promise<FetcherResult> {
    const {fsym, tsym} = params;
    const {symbols, timestamp} = options;

    this.logger.debug(`${this.logPrefix} call for ${symbols}: ${fsym}, ${tsym}`);

    if (!timestamp || timestamp <= 0) throw new Error(`${this.logPrefix} invalid timestamp value: ${timestamp}`);

    const price = await this.polygonIOCryptoPriceService.getLatestPrice({fsym, tsym}, timestamp);

    if (!price) {
      this.logger.error(`${this.logPrefix} NO price for ${fsym}-${tsym}`);
      return {prices: []};
    }

    await this.priceDataRepository.saveFetcherResults(
      {prices: [price]},
      symbols,
      FetcherName.PolygonIOCryptoPrice,
      PriceValueType.Price,
      PolygonIOCryptoPriceFetcher.fetcherSource,
    );

    return {prices: [price]};
  }
}
