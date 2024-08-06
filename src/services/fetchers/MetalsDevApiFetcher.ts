import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherName,
  FetcherResult,
  PriceValueType,
} from '../../types/fetchers.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import Settings from '../../types/Settings.js';
import TimeService from '../TimeService.js';
import {MetalsDevApiDataRepository} from '../../repositories/fetchers/MetalsDevApiDataRepository.js';

export interface MetalsDevApiPriceInputParams {
  metal: string;
  currency: string;
}

@injectable()
export default class MetalsDevApiPriceFetcher implements FeedFetcherInterface {
  @inject(MetalsDevApiDataRepository) private metalsDevApiDataRepository!: MetalsDevApiDataRepository;
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

  async apply(params: MetalsDevApiPriceInputParams, options: FeedFetcherOptions): Promise<FetcherResult> {
    const {metal, currency} = params;
    const {symbols} = options;

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
        return {prices: []};
      }

      const pricePerGram = response.data.metals[metal.toLowerCase()];

      if (!pricePerGram) {
        this.logger.error(`${this.logPrefix} Missing price for ${metal} in ${currency}`);
        return {prices: []};
      }

      this.logger.debug(`${this.logPrefix} resolved price per gram: ${metal}/${currency}: ${pricePerGram}`);

      const timestamp = this.timeService.apply();

      await this.metalsDevApiDataRepository.save([
        {
          value: pricePerGram,
          timestamp,
          params,
        },
      ]);

      const [price] = await this.metalsDevApiDataRepository.getPrices([params], timestamp);
      const result = {prices: [price], timestamp};

      // TODO this will be deprecated once we fully switch to DB and have dedicated charts
      await this.priceDataRepository.saveFetcherResults(
        result,
        symbols,
        FetcherName.MetalsDevApi,
        PriceValueType.Price,
        MetalsDevApiPriceFetcher.fetcherSource,
      );

      return result;
    } catch (error) {
      this.logger.error(`${this.logPrefix} An error occurred while fetching metal prices: ${error}`);
      return {prices: []};
    }
  }
}
