import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository, PriceDataPayload} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import {FetcherName} from '../../types/fetchers.js';
import Settings from '../../types/Settings.js';

export interface MetalsDevApiInputParams {
  metal: string;
  currency: string;
}

@injectable()
export default class MetalsDevApiPriceFetcher {
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private apiKey: string;
  private timeout: number;

  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.metalsDevApi.apiKey;
    this.timeout = settings.api.metalsDevApi.timeout;
  }

  async apply(input: MetalsDevApiInputParams): Promise<number> {
    this.logger.debug(`[MetalsDevApiFetcherFetcher] call for: ${input.metal}/${input.currency}`);

    const url = `https://api.metals.dev/v1/latest?api_key=${this.apiKey}&currency=${input.currency}&unit=g`;

    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        timeoutErrorMessage: `[MetalsDevApiFetcherFetcher] Timeout exceeded: ${url}`,
      });

      if (response.status !== 200) {
        this.logger.error(
          `[MetalsDevApiFetcherFetcher] Error for ${input.metal}/${input.currency}: ${response.statusText}`,
        );

        throw new Error(response.data);
      }

      const pricePerGram = response.data.metals[input.metal.toLowerCase()];

      if (pricePerGram !== undefined) {
        this.logger.debug(
          `[MetalsDevApiFetcherFetcher] resolved price per gram: ${input.metal}/${input.currency}: ${pricePerGram}`,
        );

        const payload: PriceDataPayload = {
          fetcher: FetcherName.METALS_DEV_API,
          value: pricePerGram.toString(),
          valueType: 'string',
          timestamp: this.timeService.apply(),
          feedBase: input.currency,
          feedQuote: input.metal,
          fetcherSource: MetalsDevApiPriceFetcher.fetcherSource,
        };

        await this.priceDataRepository.savePrice(payload);

        return pricePerGram;
      } else {
        throw new Error(`[MetalsDevApiFetcherFetcher] Missing price for ${input.metal} in ${input.currency}`);
      }
    } catch (error) {
      this.logger.error(`[MetalsDevApiFetcherFetcher] An error occurred while fetching metal prices: ${error}`);
      throw new Error('Failed to fetch metal prices');
    }
  }
}
