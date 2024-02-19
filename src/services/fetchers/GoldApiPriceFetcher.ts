import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';

export interface GoldApiInputParams {
  symbol: string;
  currency: string;
}

export interface GoldApiOutputValues {
  symbol: string;
  currency: string;
  priceGram24k: number;
}

@injectable()
export default class GoldApiPriceFetcher {
  @inject('Logger') private logger!: Logger;

  private token: string;
  private timeout: number;

  constructor(@inject('Settings') settings: Settings) {
    this.token = settings.api.goldApi.apiKey;
    this.timeout = settings.api.goldApi.timeout;
  }

  async apply(input: GoldApiInputParams): Promise<GoldApiOutputValues> {
    this.logger.debug(`[GoldApiPriceFetcher] call for: ${input.symbol}/${input.currency}`);

    const url = this.assembleUrl(input.symbol, input.currency);

    const response = await axios.get(url, {
      headers: {
        'x-access-token': this.token,
      },
      timeout: this.timeout,
      timeoutErrorMessage: `[GoldApiPriceFetcher] Timeout exceeded: ${url}`,
    });

    if (response.status !== 200) {
      this.logger.error(
        `[GoldApiPriceFetcher] Error fetching data for ${input.symbol}/${input.currency}: ${response.statusText}`,
      );
      throw new Error(response.data);
    }

    const {metal, currency, price_gram_24k} = response.data;
    if (price_gram_24k !== undefined) {
      this.logger.debug(`[GoldApiPriceFetcher] resolved price: ${input.symbol}/${input.currency}: ${price_gram_24k}`);

      return {
        symbol: metal,
        currency,
        priceGram24k: price_gram_24k,
      };
    } else {
      throw new Error(`[GoldApiPriceFetcher] Missing rate for ${input.symbol}/${input.currency}`);
    }
  }

  private assembleUrl(symbol: string, currency: string): string {
    return `https://www.goldapi.io/api/${symbol}/${currency}`;
  }
}
