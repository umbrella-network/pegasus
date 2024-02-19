import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';

export interface MetalsDevApiInputParams {
  metal: string;
  currency: string;
}

export interface MetalsDevApiOutputValues {
  metal: string;
  currency: string;
  priceGram24k: number;
}

@injectable()
export default class MetalsDevApiPriceFetcher {
  @inject('Logger') private logger!: Logger;

  private apiKey: string;
  private timeout: number;

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.metalsDevApi.apiKey;
    this.timeout = settings.api.metalsDevApi.timeout;
  }

  async apply(input: MetalsDevApiInputParams): Promise<MetalsDevApiOutputValues> {
    this.logger.debug(`[MetalsDevApiFetcherFetcher] call for: ${input.metal}/${input.currency}`);

    const url = `https://api.metals.dev/v1/latest?api_key=${this.apiKey}&currency=${input.currency}&unit=g`;

    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        timeoutErrorMessage: `[MetalsDevApiFetcherFetcher] Timeout exceeded: ${url}`,
      });

      if (response.status !== 200) {
        this.logger.error(
          `[MetalsDevApiFetcherFetcher] Error fetching data for ${input.metal}/${input.currency}: ${response.statusText}`,
        );
        throw new Error(response.data);
      }

      const pricePerGram = response.data.metals[input.metal.toLowerCase()];
      if (pricePerGram !== undefined) {
        this.logger.debug(
          `[MetalsDevApiFetcherFetcher] resolved price per gram: ${input.metal}/${input.currency}: ${pricePerGram}`,
        );

        return {
          metal: input.metal,
          currency: input.currency,
          priceGram24k: pricePerGram,
        };
      } else {
        throw new Error(`[MetalsDevApiFetcherFetcher] Missing price for ${input.metal} in ${input.currency}`);
      }
    } catch (error) {
      this.logger.error(`[MetalsDevApiFetcherFetcher] An error occurred while fetching metal prices: ${error}`);
      throw new Error('Failed to fetch metal prices');
    }
  }
}
