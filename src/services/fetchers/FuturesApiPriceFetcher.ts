import axios, { AxiosResponse } from 'axios';
import { inject, injectable } from 'inversify';
import { Logger } from 'winston';

import Settings from '../../types/Settings.js';
import { splitIntoBatches } from '../../utils/collections.js';

export interface FuturesApiInputParams {
  symbol: string;
}

export interface FuturesApiOutputValues {
  symbol: string;
  name: string;
  last: number;
}

@injectable()
export default class FuturesApiPriceFetcher {
  @inject('Logger') private logger!: Logger;

  private apiKey: string;
  private timeout: number;

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.futuresApi.apiKey;
    this.timeout = settings.api.futuresApi.timeout;
  }

  async apply(inputs: FuturesApiInputParams): Promise<FuturesApiOutputValues> {
    const { symbol } = inputs;

    const url = `https://api.futures-api.com/last`;
    const headers = {
      'x-api-key': this.apiKey,
    };

    try {
      const response: AxiosResponse = await axios.get(url, {
        params: { symbol },
        headers,
        timeout: this.timeout,
        timeoutErrorMessage: `Timeout exceeded: ${url}`,
      });

      if (response.status === 200) {
        const { metadata, data } = response.data;
        this.logger.debug(`[FuturesApiPriceFetcher] call for: ${symbol}`);

        if (data.length > 0) {
          const firstDataItem = data[0];

          return {
            symbol: metadata.symbol,
            name: metadata.name,
            last: firstDataItem.last,
          };
        } else {
          this.logger.warn(`[FuturesApiPriceFetcher] No data available for ${symbol}`);
          throw new Error(`No data available for symbol: ${symbol}`);
        }
      } else {
        this.logger.error(`[FuturesApiPriceFetcher] Error fetching data: ${response.data}`);
        throw new Error(`Futures API request failed: ${response.statusText}`);
      }
    } catch (error: any) {
      this.logger.error(`[FuturesApiPriceFetcher] Error fetching data: ${error.message}`);
      throw new Error(`Futures API request failed: ${error.message}`);
    }
  }
}
