import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {FeedFetcherInterface, FeedFetcherOptions, FetcherName, NumberOrUndefined} from '../../types/fetchers.js';
import {PriceDataRepository, PriceValueType} from '../../repositories/PriceDataRepository.js';
import Settings from '../../types/Settings.js';
import TimeService from '../TimeService.js';

export interface MetalsDevApiInputParams {
  metal: string;
  currency: string;
}

@injectable()
export default class MetalsDevApiPriceFetcher implements FeedFetcherInterface {
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private apiKey: string;
  private timeout: number;
  private logPrefix = `[${FetcherName.MetalsDevApi}]`;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.metalsDevApi.apiKey;
    this.timeout = settings.api.metalsDevApi.timeout;
  }

  async apply(params: MetalsDevApiInputParams, options: FeedFetcherOptions): Promise<NumberOrUndefined> {
    const {metal, currency} = params;
    const {base: feedBase, quote: feedQuote} = options;

    this.logger.debug(`${this.logPrefix} call for: ${metal}/${currency}`);

    const apiUrl = 'https://api.metals.dev/v1/latest';
    const url = `${apiUrl}?api_key=${this.apiKey}&currency=${currency}&unit=g`;

    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        timeoutErrorMessage: `${this.logPrefix} Timeout exceeded: ${url}`,
      });

      if (response.status !== 200) {
        this.logger.error(
          `${this.logPrefix} Error for ${metal}/${currency}: ${response.statusText}. Error: ${response.data}`,
        );
        return;
      }

      const pricePerGram = response.data.metals[metal.toLowerCase()];

      if (!pricePerGram) {
        this.logger.error(`${this.logPrefix} Missing price for ${metal} in ${currency}`);
        return;
      }

      this.logger.debug(`${this.logPrefix} resolved price per gram: ${metal}/${currency}: ${pricePerGram}`);

      await this.priceDataRepository.saveFetcherResults(
        {prices: [pricePerGram]},
        [`${feedBase}-${feedQuote}`],
        FetcherName.MetalsDevApi,
        PriceValueType.Price,
        MetalsDevApiPriceFetcher.fetcherSource,
      );

      return pricePerGram;
    } catch (error) {
      this.logger.error(`${this.logPrefix} An error occurred while fetching metal prices: ${error}`);
      return;
    }
  }
}
