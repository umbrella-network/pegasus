import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import axios from 'axios';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherName,
  FetcherResult,
  FetchedValueType,
} from '../../types/fetchers.js';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import Settings from '../../types/Settings.js';
import TimeService from '../TimeService.js';
import {GoldApiDataRepository} from '../../repositories/fetchers/GoldApiDataRepository.js';

export interface GoldApiPriceInputParams {
  symbol: string;
  currency: string;
}

@injectable()
export class GoldApiPriceFetcher implements FeedFetcherInterface {
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(GoldApiDataRepository) private goldApiDataRepository!: GoldApiDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private token: string;
  private timeout: number;
  private logPrefix = `[${FetcherName.GoldApiPrice}]`;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.token = settings.api.goldApi.apiKey;
    this.timeout = settings.api.goldApi.timeout;
  }

  async apply(params: GoldApiPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    try {
      await this.fetchPrices(params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} fetchPrices: ${(e as Error).message}`);
    }

    const {symbols} = options;

    const prices = await this.goldApiDataRepository.getPrices(params, options.timestamp);

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      {prices, timestamp: options.timestamp},
      symbols,
      FetcherName.MetalsDevApi,
      FetchedValueType.Price,
      GoldApiPriceFetcher.fetcherSource,
    );

    return {prices};
  }

  private async fetchPrices(params: GoldApiPriceInputParams[]): Promise<void> {
    if (params.length != 1) throw new Error(`${this.logPrefix} not a multifetcher: ${params}`);

    const {symbol, currency} = params[0];

    this.logger.debug(`${this.logPrefix} call for: ${symbol}/${currency}`);

    const url = `https://www.goldapi.io/api/${symbol}/${currency}`;

    const response = await axios.get(url, {
      headers: {'x-access-token': this.token},
      timeout: this.timeout,
      timeoutErrorMessage: `${this.logPrefix} Timeout exceeded: ${url}`,
    });

    if (response.status !== 200) {
      this.logger.error(
        `${this.logPrefix} Error fetching data for ${symbol}/${currency}: ${response.statusText}.` +
          `Error: ${response.data}`,
      );

      return;
    }

    const {price_gram_24k} = response.data;

    if (!price_gram_24k) {
      this.logger.error(`${this.logPrefix} Missing rate for ${symbol}/${currency}`);
      return;
    }

    this.logger.debug(`${this.logPrefix} resolved price: ${symbol}/${currency}: ${price_gram_24k}`);

    await this.goldApiDataRepository.save([
      {
        value: price_gram_24k,
        timestamp: this.timeService.apply(),
        params: params[0],
      },
    ]);
  }
}
