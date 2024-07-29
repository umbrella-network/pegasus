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

@injectable()
export default class CoingeckoPriceFetcher implements FeedMultiFetcherInterface {
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
        const baseUrl = 'https://api.coingecko.com/api/v3/simple/price';
        const ids = inputs.map((o) => o.id);
        const currencies = inputs.map((o) => o.currency);
        const url = `${baseUrl}?ids=${ids}&vs_currencies=${currencies}`;

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
      FetcherName.CoingeckoPrice,
      PriceValueType.Price,
      CoingeckoPriceFetcher.fetcherSource,
    );

    return fetcherResult;
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
