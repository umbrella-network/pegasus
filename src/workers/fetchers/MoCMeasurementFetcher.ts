import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ServiceInterface} from '../../types/fetchers.js';

import {
  MoCMeasurementDataRepository,
  MoCMeasurementDataRepositoryInput,
} from '../../repositories/fetchers/MoCMeasurementDataRepository.js';

import {MappingRepository} from '../../repositories/MappingRepository.js';
import {FetchersMappingCacheKeys} from '../../services/fetchers/common/FetchersMappingCacheKeys.js';
import {AxiosResponseChecker} from './_common/AxiosResponseChecker.js';
import {MoCMeasurementCache} from '../../types/fetchersCachedTypes.js';

// field => value
type ParsedResponse = {measurement_id: string; timestamp: number; field: string; value: number};
type CachedParams = {measurement_id: string; fields: string[]};


/*

Feed-Name:
  inputs:
    - fetcher:
        name: MoCMeasurement
        params:
          measurement_id: rdocMainnet
          field: rifp_leverage


https://api.moneyonchain.com/api/doc

*/
@injectable()
export class MoCMeasurementFetcher implements ServiceInterface {
  @inject(AxiosResponseChecker) private axiosResponseChecker!: AxiosResponseChecker;
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(MoCMeasurementDataRepository) private moCMeasurementDataRepository!: MoCMeasurementDataRepository;
  @inject('Logger') private logger!: Logger;

  private logPrefix = '[MoCMeasurementFetcher]';

  async apply(): Promise<void> {
    try {
      await this.fetchPrices();
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }
  }

  private async fetchPrices(): Promise<void> {
    const mocParams = await this.generateInput();

    if (mocParams.length == 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return;
    }

    await Promise.allSettled(mocParams.map((params) => this.fetchPrice(params)));
  }

  public async fetchPrice(params: CachedParams): Promise<void> {
    if (params.fields.length == 0) {
      this.logger.debug(`${this.logPrefix} no fields for ${params.measurement_id}`);
      return;
    }

    const baseUrl = 'https://api.moneyonchain.com/api/measurement/';
    const url = `${baseUrl}${params.measurement_id}`;
    const response = await axios.get(url);

    const parsed = this.parseResponse(response, params);
    await this.savePrices(parsed);
  }

  private parseResponse(axiosResponse: AxiosResponse, params: CachedParams): ParsedResponse[] {
    if (!this.axiosResponseChecker.apply(axiosResponse, this.logPrefix)) return [];

    const measurement_id = params.measurement_id;

    const outputs: ParsedResponse[] = [];

    params.fields.forEach((field) => {
      if (!axiosResponse.data[field]) {
        this.logger.warn(`${this.logPrefix} missing field (or null) '${field}' for ${measurement_id}`);
        return;
      }

      let value = axiosResponse.data[field];

      if (!value) {
        this.logger.warn(`${this.logPrefix} missing value for ${measurement_id}: ${field}`);
        return;
      }

      if (isNaN(parseFloat(value))) {
        this.logger.error(`${this.logPrefix} resolved price: ${measurement_id}: ${field}: ${value}`);
        return;
      }

      value = parseFloat(value);

      const timestamp = this.parseTime(axiosResponse.data['time']);

      outputs.push({measurement_id, field, value, timestamp});
      this.logger.debug(`${this.logPrefix} resolved price: ${measurement_id}: ${field}: ${value} at ${timestamp}`);
    });

    return outputs;
  }

  private async savePrices(parsed: ParsedResponse[]): Promise<void> {
    const allData: MoCMeasurementDataRepositoryInput[] = parsed.map((data) => {
      return {
        timestamp: data.timestamp,
        value: data.value,
        params: {
          measurement_id: data.measurement_id,
          field: data.field,
        },
      };
    });

    await this.moCMeasurementDataRepository.save(allData);
  }

  private async generateInput(): Promise<CachedParams[]> {
    const paramsKey = FetchersMappingCacheKeys.MOC_MEASUREMENT_PARAMS;

    const cache = await this.mappingRepository.get(paramsKey);
    const parsed = JSON.parse(cache || '{}') as MoCMeasurementCache;

    const result: CachedParams[] = [];

    Object.keys(parsed).forEach((measurement_id) => {
      result.push({
        measurement_id,
        fields: parsed[measurement_id],
      });
    });

    return result;
  }

  private parseTime(t: string): number {
    const d = new Date(t.toLowerCase().endsWith('z') ? t : `${t}Z`);
    return Math.trunc(d.getTime() / 1000);
  }
}
