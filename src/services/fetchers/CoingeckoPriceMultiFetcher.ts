import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';
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

interface APIParams {
  ids: string[];
  vsCurrencies: string[];
}

@injectable()
export default class CoingeckoPriceMultiFetcher {
  @inject('Logger') private logger!: Logger;

  private timeout: number;
  private maxBatchSize: number;

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.coingecko.timeout;
    this.maxBatchSize = settings.api.coingecko.maxBatchSize;
  }

  async apply(inputs: InputParams[]): Promise<OutputValues[]> {
    const batchedInputs = <InputParams[][]>splitIntoBatches(inputs, this.maxBatchSize);
    this.logger.debug(`[CoingeckoPriceMultiFetcher] call for: ${inputs.map((i) => i.id).join(', ')}`);

    const responses = await Promise.all(
      batchedInputs.map((inputs) => {
        const params = this.extractParams(inputs);
        const url = this.assembleUrl(params.vsCurrencies, params.ids);

        return axios.get(url, {
          timeout: this.timeout,
          timeoutErrorMessage: `Timeout exceeded: ${url}`,
        });
      }),
    );

    const outputs = responses.map((response) => this.processResponse(response, inputs));

    return outputs.flat();
  }

  private assembleUrl(vsCurrencies: string[], coinIds: string[]): string {
    if (vsCurrencies.length == 0) {
      throw new Error('[CoingeckoPriceMultiFetcher] empty vsCurrencies');
    }

    if (coinIds.length == 0) {
      throw new Error('[CoingeckoPriceMultiFetcher] empty coinIds');
    }

    return `https://api.coingecko.com/api/v3/simple/price?ids=${coinIds}&vs_currencies=${vsCurrencies}`;
  }

  private extractParams(inputs: InputParams[]): APIParams {
    const params: APIParams = {
      ids: [],
      vsCurrencies: [],
    };

    inputs.forEach((input) => {
      params.ids.push(input.id);
      params.vsCurrencies.push(input.currency);
    });

    return params;
  }

  private processResponse(response: AxiosResponse, inputs: InputParams[]): OutputValues[] {
    if (response.status !== 200) {
      throw new Error(response.data);
    }

    if (response.data.Response === 'Error') {
      throw new Error(response.data.Message);
    }

    const outputs: OutputValues[] = [];

    inputs.forEach((input) => {
      const {id, currency} = input;
      const value: number | undefined = (response.data[id] || {})[currency.toLowerCase()];

      if (value) {
        this.logger.debug(`[CoingeckoPriceMultiFetcher] resolved price: ${id}-${currency}: ${value}`);

        outputs.push({
          id,
          currency,
          value: value,
        });
      }
    });

    return outputs;
  }
}
