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

type ParsedResponse = {id: string; currency: string; value: number; timestamp: number};

@injectable()
export class CoingeckoPriceService implements ServiceInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(CoingeckoDataRepository) private coingeckoDataRepository!: CoingeckoDataRepository;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.CoingeckoPrice}]`;
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
    const {ids, currencies} = await this.generateInput();

    const batchedInputs = _.chunk(ids, Math.ceil(this.maxBatchSize));

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

    const parsed = this.parseResponse(responses);
    await this.savePrices(parsed);
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

  private async generateInput(): Promise<{ids: string[]; currencies: string[]}> {
    const idKey = `${FetcherName.CoingeckoPrice}_cachedIds`;
    const currenciesKey = `${FetcherName.CoingeckoPrice}_vs_currencies`;

    const cache = await this.mappingRepository.getMany([idKey, currenciesKey]);
    const idsCache = JSON.parse(cache[idKey] || '{}');
    const currenciesCache = JSON.parse(cache[currenciesKey] || '{}');

    const ids = Object.keys(idsCache);
    const currencies = Object.keys(currenciesCache);

    return {ids, currencies};
  }
}
