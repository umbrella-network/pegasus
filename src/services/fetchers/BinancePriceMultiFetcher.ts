import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';
import FetcherAPILimit from '../../types/FetcherAPILimit.js';
import {splitIntoBatches} from '../../utils/collections.js';

export interface InputParams {
  id: string;
  currency: string;
}

export interface OutputValues {
  id: string;
  currency: string;
  value: number;
}

@injectable()
export default class BinancePriceMultiFetcher {
  @inject('Logger') private logger!: Logger;
  @inject('FetcherAPILimit') private fetcherAPILimit!: FetcherAPILimit;

  private timeout: number;
  private maxBatchSize: number;

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.binance.timeout;
    this.maxBatchSize = settings.api.binance.maxBatchSize;
  }

  async apply(inputs: InputParams[]): Promise<OutputValues[]> {
    this.logger.debug(`fetcherAPILimit: ${JSON.stringify(this.fetcherAPILimit)}`);
    if (Date.now() <= this.fetcherAPILimit.binance.nextTry) {
      this.logger.warn(`[BinancePriceMultiFetcher] skip call, next try in ${this.fetcherAPILimit.binance.nextTry}`);
      return [];
    }

    const batchedInputs = <InputParams[][]>splitIntoBatches(inputs, this.maxBatchSize);

    this.logger.debug(
      `[BinancePriceMultiFetcher] call for: ${inputs.map((input) => `${this.buildSymbol(input)}`).join(', ')}`,
    );

    const responses = await Promise.all(
      batchedInputs.map((inputs) => {
        const symbols = this.extractSymbols(inputs);
        const url = this.assembleUrl(symbols);

        this.logger.debug(`[BinancePriceMultiFetcher] call url: ${url}`);

        return axios.get(url, {
          timeout: this.timeout,
          timeoutErrorMessage: `Timeout exceeded: ${url}`,
          validateStatus: () => true,
        });
      }),
    );

    const outputs = responses.map((response) => this.processResponse(response, inputs));

    return outputs.flat();
  }

  private assembleUrl(symbols: string[]) {
    if (symbols.length == 0) {
      throw new Error('[BinancePriceMultiFetcher] empty symbols');
    }

    return `https://api.binance.com/api/v3/ticker/price?symbols=[${symbols.join(',')}]`;
  }

  private extractSymbols(inputs: InputParams[]) {
    const symbols: string[] = [];

    inputs.forEach((input) => {
      symbols.push(`"${this.buildSymbol(input)}"`);
    });

    return symbols;
  }

  private processResponse(response: AxiosResponse, inputs: InputParams[]): OutputValues[] {
    this.validateResponse(response);

    const outputs: OutputValues[] = [];

    inputs.forEach((input) => {
      const {id, currency} = input;

      const value: number | undefined = response.data.find((data: Record<string, string>) => {
        return data.symbol === this.buildSymbol(input);
      }).price;

      if (value) {
        this.logger.debug(`[BinancePriceMultiFetcher] resolved price: ${this.buildSymbol(input)}: ${value}`);

        outputs.push({id, currency, value});
      }
    });

    return outputs;
  }

  private validateResponse(response: AxiosResponse) {
    if ([429, 418].includes(response.status)) {
      const retryInSeconds = response.headers['Retry-After'] || response.headers['retry-after'];
      const nextTry = Number(Date.now()) + Number(retryInSeconds);
      this.fetcherAPILimit.binance.nextTry = nextTry;
      this.logger.debug(`nextTry ${nextTry}`);
      throw new Error(`[BinancePriceMultiFetcher] Request rate limit, retry in: ${retryInSeconds} seconds`);
    }

    if (response.status !== 200) {
      throw new Error(JSON.stringify(response.data));
    }

    if (response.data.Response === 'Error') {
      throw new Error(JSON.stringify(response.data.Message));
    }
  }

  private buildSymbol(feed: InputParams) {
    return `${feed.id}${feed.currency}`;
  }
}
