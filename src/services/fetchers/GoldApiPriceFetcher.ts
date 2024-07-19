import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import {FeedFetcherInterface, FeedFetcherOptions, FetcherName} from '../../types/fetchers.js';
import Settings from '../../types/Settings.js';
import TimeService from '../TimeService.js';

export interface GoldApiInputParams {
  symbol: string;
  currency: string;
}

@injectable()
export default class GoldApiPriceFetcher implements FeedFetcherInterface {
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private token: string;
  private timeout: number;
  private logPrefix = `[${FetcherName.GOLD_API_PRICE}]`;

  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.token = settings.api.goldApi.apiKey;
    this.timeout = settings.api.goldApi.timeout;
  }

  async apply(params: GoldApiInputParams, options: FeedFetcherOptions): Promise<number> {
    const {symbol, currency} = params;
    const {base: feedBase, quote: feedQuote} = options;

    this.logger.debug(`${this.logPrefix} call for: ${symbol}/${currency}`);

    const url = this.assembleUrl(symbol, currency);

    const response = await axios.get(url, {
      headers: {
        'x-access-token': this.token,
      },
      timeout: this.timeout,
      timeoutErrorMessage: `${this.logPrefix} Timeout exceeded: ${url}`,
    });

    if (response.status !== 200) {
      this.logger.error(`${this.logPrefix} Error fetching data for ${symbol}/${currency}: ${response.statusText}`);
      throw new Error(response.data);
    }

    const {price_gram_24k} = response.data;

    if (price_gram_24k !== undefined) {
      this.logger.debug(`${this.logPrefix} resolved price: ${symbol}/${currency}: ${price_gram_24k}`);

      const payload: PriceDataPayload = {
        fetcher: FetcherName.GOLD_API_PRICE,
        value: price_gram_24k.toString(),
        valueType: PriceValueType.Price,
        timestamp: this.timeService.apply(),
        feedBase,
        feedQuote,
        fetcherSource: GoldApiPriceFetcher.fetcherSource,
      };

      await this.priceDataRepository.savePrice(payload);

      return price_gram_24k;
    } else {
      throw new Error(`${this.logPrefix} Missing rate for ${symbol}/${currency}`);
    }
  }

  private assembleUrl(symbol: string, currency: string): string {
    return `https://www.goldapi.io/api/${symbol}/${currency}`;
  }
}
