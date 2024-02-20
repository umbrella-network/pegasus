import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';

const GRAMS_PER_TROY_OUNCE = 31.1035;

export interface MetalPriceApiInputParams {
  symbol: string;
  currency: string;
}

export interface MetalPriceApiOutputValues {
  symbol: string;
  currency: string;
  priceGram24k: number;
}

@injectable()
export default class MetalPriceApiFetcher {
  @inject('Logger') private logger!: Logger;

  private apiKey: string;
  private timeout: number;

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.metalPriceApi.apiKey;
    this.timeout = settings.api.metalPriceApi.timeout;
  }

  async apply(input: MetalPriceApiInputParams): Promise<MetalPriceApiOutputValues> {
    this.logger.debug(`[MetalPriceApiFetcher] call for: ${input.symbol}/${input.currency}`);

    const url = `https://api.metalpriceapi.com/v1/latest?api_key=${this.apiKey}&base=${input.currency}&currency=${input.symbol}`;

    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        timeoutErrorMessage: `[MetalPriceApiFetcher] Timeout exceeded: ${url}`,
      });

      if (response.status !== 200) {
        this.logger.error(
          `[MetalPriceApiFetcher] Error fetching data for ${input.symbol}/${input.currency}: ${response.statusText}`,
        );
        throw new Error(response.data);
      }
      const rate = response.data.rates[input.symbol];
      if (rate !== undefined) {
        const pricePerTroyOunce = 1 / rate;
        const pricePerGram = pricePerTroyOunce / GRAMS_PER_TROY_OUNCE;
        this.logger.debug(
          `[MetalPriceApiFetcher] resolved price per gram: ${input.symbol}/${input.currency}: ${pricePerGram}`,
        );

        return {
          symbol: input.symbol,
          currency: input.currency,
          priceGram24k: pricePerGram,
        };
      } else {
        throw new Error(`[MetalPriceApiFetcher] Missing rate for ${input.symbol}/${input.currency}`);
      }
    } catch (error) {
      this.logger.error(`[MetalPriceApiFetcher] An error occurred while fetching metal prices: ${error}`);
      throw new Error('Failed to fetch metal prices');
    }
  }
}
