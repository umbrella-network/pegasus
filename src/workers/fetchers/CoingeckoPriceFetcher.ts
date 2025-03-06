import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import _ from 'lodash';

import Settings from '../../types/Settings.js';

import {FetcherName, ServiceInterface} from '../../types/fetchers.js';

import {
  CoingeckoDataRepository,
  CoingeckoDataRepositoryInput,
} from '../../repositories/fetchers/CoingeckoDataRepository.js';

import {MappingRepository} from '../../repositories/MappingRepository.js';
import {DeviationFeedsGetter} from './_common/DeviationFeedsGetter.js';
import {CoingeckoPriceInputParams} from '../../services/fetchers/CoingeckoPriceGetter.js';

type ParsedResponse = {id: string; currency: string; value: number; timestamp: number};

@injectable()
export class CoingeckoPriceFetcher implements ServiceInterface {
  @inject(DeviationFeedsGetter) feedsGetter!: DeviationFeedsGetter;
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(CoingeckoDataRepository) private coingeckoDataRepository!: CoingeckoDataRepository;
  @inject('Logger') private logger!: Logger;

  private logPrefix = '[CoingeckoPriceFetcher]';
  private timeout: number;
  private maxBatchSize: number;

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.coingecko.timeout;
    this.maxBatchSize = settings.api.coingecko.maxBatchSize;
  }

  async apply(): Promise<void> {
    try {
      await this.fetchPrices();
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }
  }

  private async fetchPrices(): Promise<void> {
    const params = await this.feedsGetter.apply<CoingeckoPriceInputParams>(FetcherName.CoingeckoPrice);
    if (params.length == 0) return;

    const map: Record<string, string> = {};

    params.forEach((p) => {
      map[p.id] = p.currency;
    });

    const currencies = Object.values(map);

    if (currencies.length == 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return;
    }

    const batchedInputs = _.chunk(Object.keys(map), Math.ceil(this.maxBatchSize));

    const responses = await Promise.allSettled(
      batchedInputs.map((inputs) => {
        const baseUrl = 'https://api.coingecko.com/api/v3/simple/price';
        const url = `${baseUrl}?ids=${inputs}&vs_currencies=${currencies}&precision=18&include_last_updated_at=true`;

        this.logger.debug(`${this.logPrefix} batched call ${url}`);

        return axios.get(url, {
          timeout: this.timeout,
          timeoutErrorMessage: `Timeout exceeded: ${url}`,
        });
      }),
    );

    const parsed = this.parseResponse(responses, currencies);
    await this.savePrices(parsed);
  }

  private parseResponse(axiosResponse: PromiseSettledResult<AxiosResponse>[], currencies: string[]): ParsedResponse[] {
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

        currencies.forEach((currency) => {
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

          outputs.push({id, currency, value, timestamp: axiosResponse.data[id]['last_updated_at']});
          this.logger.debug(`${this.logPrefix} resolved price: ${id}-${currency}: ${value}`);
        });
      });
    });

    return outputs;
  }

  private async savePrices(parsed: ParsedResponse[]): Promise<void> {
    const allData: CoingeckoDataRepositoryInput[] = parsed.map((data) => {
      return {
        timestamp: data.timestamp,
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
