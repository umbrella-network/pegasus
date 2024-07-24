import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import _ from 'lodash';

import Settings from '../../types/Settings.js';

import {
  FeedMultiFetcherInterface,
  FeedMultiFetcherOptions,
  FetcherResult,
  FetcherName,
  NumberOrUndefined,
} from '../../types/fetchers.js';

import {PriceDataRepository, PriceValueType} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';

export interface InputParams {
  id: string;
  currency: string;
}

interface APIParams {
  ids: string[];
  vsCurrencies: string[];
}

@injectable()
export default class CoingeckoPriceMultiFetcher implements FeedMultiFetcherInterface {
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private timeout: number;
  private maxBatchSize: number;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.coingecko.timeout;
    this.maxBatchSize = settings.api.coingecko.maxBatchSize;
  }

  async apply(inputs: InputParams[], options: FeedMultiFetcherOptions): Promise<FetcherResult> {
    const batchedInputs = _.chunk(inputs, this.maxBatchSize);
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

    const fetcherResult = {prices: outputs.flat(), timestamp: this.timeService.apply()};

    this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.COINGECKO_PRICE,
      PriceValueType.Price,
      CoingeckoPriceMultiFetcher.fetcherSource,
    );

    return fetcherResult;
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

  private processResponse(response: AxiosResponse, inputs: InputParams[]): NumberOrUndefined[] {
    if (response.status !== 200) {
      throw new Error(response.data);
    }

    if (response.data.Response === 'Error') {
      throw new Error(response.data.Message);
    }

    const outputs: NumberOrUndefined[] = [];

    inputs.forEach((input) => {
      const {id, currency} = input;
      const value: NumberOrUndefined = (response.data[id] || {})[currency.toLowerCase()];

      if (value) {
        this.logger.debug(`[CoingeckoPriceMultiFetcher] resolved price: ${id}-${currency}: ${value}`);

        outputs.push(value);
      }
    });

    return outputs;
  }
}
