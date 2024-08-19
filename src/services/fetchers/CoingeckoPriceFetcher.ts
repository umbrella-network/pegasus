import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import _ from 'lodash';

import Settings from '../../types/Settings.js';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherResult,
  FetcherName,
  FetchedValueType,
} from '../../types/fetchers.js';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';

import {
  CoingeckoDataRepository,
  CoingeckoDataRepositoryInput,
} from '../../repositories/fetchers/CoingeckoDataRepository.js';

import {uniqueElements} from '../../utils/arrays.js';

export interface CoingeckoPriceInputParams {
  id: string;
  currency: string;
}

type ParsedResponse = {id: string; currency: string; value: number};

@injectable()
export class CoingeckoPriceFetcher implements FeedFetcherInterface {
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(CoingeckoDataRepository) private coingeckoDataRepository!: CoingeckoDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.CoingeckoPrice}]`;
  private timeout: number;
  private maxBatchSize: number;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.coingecko.timeout;
    this.maxBatchSize = settings.api.coingecko.maxBatchSize;
  }

  async apply(inputsParams: CoingeckoPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    try {
      await this.fetchPrices(inputsParams);
    } catch (e) {
      this.logger.error(`${this.logPrefix} fetchPrices: ${(e as Error).message}`);
    }

    const prices = await this.coingeckoDataRepository.getPrices(inputsParams, options.timestamp);
    const fetcherResult = {prices, timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.CoingeckoPrice,
      FetchedValueType.Price,
      CoingeckoPriceFetcher.fetcherSource,
    );

    return fetcherResult;
  }

  private async fetchPrices(inputsParams: CoingeckoPriceInputParams[]): Promise<void> {
    const batchedInputs = _.chunk(inputsParams, this.maxBatchSize);

    const responses = await Promise.allSettled(
      batchedInputs.map((inputs) => {
        const baseUrl = 'https://api.coingecko.com/api/v3/simple/price';
        const ids = uniqueElements(inputs.map((o) => o.id.toLowerCase()));
        const currencies = uniqueElements(inputs.map((o) => o.currency.toLowerCase()));
        const url = `${baseUrl}?ids=${ids}&vs_currencies=${currencies}`;

        this.logger.debug(`${this.logPrefix} batched call ${url}`);

        return axios.get(url, {
          timeout: this.timeout,
          timeoutErrorMessage: `Timeout exceeded: ${url}`,
        });
      }),
    );

    const parsed = this.parseResponse(responses);
    await this.savePrices(this.timeService.apply(), parsed);
  }

  private parseResponse(axiosResponse: PromiseSettledResult<AxiosResponse>[]): ParsedResponse[] {
    const outputs: ParsedResponse[] = [];

    axiosResponse.forEach((response) => {
      if (response.status == 'rejected') {
        this.logger.error(`${this.logPrefix} rejected: ${response.reason}`);
        return;
      }

      const axiosResponse = <AxiosResponse>response.value;

      if (axiosResponse.status !== 200) {
        this.logger.error(`${this.logPrefix} status ${response.status}`);
        return;
      }

      if (axiosResponse.data.Response === 'Error') {
        this.logger.error(`${this.logPrefix} error: ${axiosResponse.data.Message || axiosResponse.data.error}`);
        return;
      }

      Object.keys(axiosResponse.data).forEach((id) => {
        if (!axiosResponse.data[id]) return;

        Object.keys(axiosResponse.data[id]).forEach((currency) => {
          let value = axiosResponse.data[id][currency];

          if (!value) {
            this.logger.warn(`${this.logPrefix} error: ${axiosResponse.data.Message || axiosResponse.data.error}`);
            return;
          }

          value = parseFloat(value);

          if (isNaN(value)) {
            this.logger.error(`${this.logPrefix} resolved price: ${id}-${currency}: ${value}`);
            return;
          }

          outputs.push({id, currency, value});
          this.logger.debug(`${this.logPrefix} resolved price: ${id}-${currency}: ${value}`);
        });
      });
    });

    return outputs;
  }

  private async savePrices(timestamp: number, parsed: ParsedResponse[]): Promise<void> {
    const allData: CoingeckoDataRepositoryInput[] = parsed.map((data) => {
      return {
        timestamp,
        value: data.value,
        params: {
          id: data.id,
          currency: data.currency,
        },
      };
    });

    await this.coingeckoDataRepository.save(allData);
  }
}
