import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import PolygonIOCryptoPriceWSService from './common/PolygonIOCryptoPriceWSService.js';
import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherName,
  FetcherResult,
  FetchedValueType,
} from '../../types/fetchers.js';
import {PolygonIOCryptoPriceWSDataRepository} from "../../repositories/fetchers/PolygonIOCryptoPriceWSDataRepository.js";

export interface PolygonIOCryptoPriceWSInputParams {
  symbol: string;
}

@injectable()
export class PolygonIOCryptoPriceWSFetcher implements FeedFetcherInterface {
  @inject(PolygonIOCryptoPriceWSService) polygonIOCryptoPriceWSService!: PolygonIOCryptoPriceWSService;
  @inject(PolygonIOCryptoPriceWSDataRepository) private pIOCryptoPriceWSDataRepository!: PolygonIOCryptoPriceWSDataRepository;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.PolygonIOCryptoPriceWS}]`;

  async apply(params: PolygonIOCryptoPriceWSInputParams, options: FeedFetcherOptions): Promise<FetcherResult> {
    const {symbols, timestamp} = options;

    this.logger.debug(`${this.logPrefix} call for ${symbols}: ${params.symbol}`);

    if (!timestamp || timestamp <= 0) throw new Error(`${this.logPrefix} invalid timestamp value: ${timestamp}`);

    const prices = await this.pIOCryptoPriceWSDataRepository.getPrices([params], timestamp);

    await this.priceDataRepository.saveFetcherResults(
      {prices, timestamp},
      symbols,
      FetcherName.PolygonIOCryptoPriceWS,
      FetchedValueType.Price
    );

    return {prices, timestamp};
  }
}
