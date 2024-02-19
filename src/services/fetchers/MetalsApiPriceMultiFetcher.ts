import axios, { AxiosResponse } from 'axios';
import { inject, injectable } from 'inversify';
import { Logger } from 'winston';

import Settings from '../../types/Settings.js';
import { splitIntoBatches } from '../../utils/collections.js';

export interface MetalsApiInputParams {
  base: string;
  outputSymbols: string[];
}

export interface MetalsApiOutputValues {
  base: string;
  outputSymbol: string;
  value: number;
}

@injectable()
export default class MetalsApiPriceMultiFetcher {
  @inject('Logger') private logger!: Logger;

  private apiKey: string;
  private timeout: number;

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.metalsApi.apiKey;
    this.timeout = settings.api.metalsApi.timeout;
  }

  async apply(inputs: MetalsApiInputParams): Promise<MetalsApiOutputValues[]> {
    const { base, outputSymbols } = inputs;
    const symbolsParam = outputSymbols.join(',');

    const url = `https://metals-api.com/api/latest?access_key=${this.apiKey}&base=${base}&symbols=${symbolsParam}`;

    try {
      const response: AxiosResponse = await axios.get(url, {
        timeout: this.timeout,
        timeoutErrorMessage: `Timeout exceeded: ${url}`,
      });

      if (response.status === 200 && response.data.success) {
        const { base, rates } = response.data;
        this.logger.debug(`[MetalsApiPriceFetcher] call for: ${base}/${symbolsParam}`);

        const outputs: MetalsApiOutputValues[] = [];

        outputSymbols.forEach((outputSymbol) => {
          const value = rates[outputSymbol];
          if (value !== undefined) {
            this.logger.debug(`[MetalsApiPriceFetcher] resolved price: ${base}/${outputSymbol}: ${value}`);
            outputs.push({
              base,
              outputSymbol,
              value,
            });
          } else {
            this.logger.warn(`[MetalsApiPriceFetcher] Missing rate for ${base}/${outputSymbol}`);
          }
        });

        return outputs;
      } else {
        this.logger.error(`[MetalsApiPriceFetcher] Error fetching data: ${response.data}`);
        throw new Error(`Metals API request failed: ${response.statusText}`);
      }
    } catch (error: any) {
      this.logger.error(`[MetalsApiPriceFetcher] Error fetching data: ${error.message}`);
      throw new Error(`Metals API request failed: ${error.message}`);
    }
  }
}
