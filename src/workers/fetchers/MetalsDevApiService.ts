import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {FetcherName, ServiceInterface} from '../../types/fetchers.js';
import Settings from '../../types/Settings.js';
import TimeService from '../../services/TimeService.js';
import {MetalsDevApiDataRepository} from '../../repositories/fetchers/MetalsDevApiDataRepository.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';

export interface MetalsDevApiPriceInputParams {
  metal: string;
  currency: string;
}

@injectable()
export class MetalsDevApiService implements ServiceInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(MetalsDevApiDataRepository) private metalsDevApiDataRepository!: MetalsDevApiDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private apiKey: string;
  private timeout: number;
  private logPrefix = '[MetalsDevApiService]';
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.metalsDevApi.apiKey;
    this.timeout = settings.api.metalsDevApi.timeout;
  }

  async apply(): Promise<void> {
    try {
      const params = await this.getInput();

      if (params.length === 0) {
        this.logger.debug(`${this.logPrefix} no inputs to fetch`);
        return;
      }

      await this.fetchPrices(params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }
  }

  private async fetchPrices(params: MetalsDevApiPriceInputParams[]): Promise<void> {
    if (params.length != 1) throw new Error(`${this.logPrefix} not a multifetcher: ${params}`);

    const {metal, currency} = params[0];

    this.logger.debug(`${this.logPrefix} call for: ${metal}/${currency}`);

    const apiUrl = 'https://api.metals.dev/v1/latest';
    const url = `${apiUrl}?api_key=${this.apiKey}&currency=${currency}&unit=g`;

    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        timeoutErrorMessage: `${this.logPrefix} Timeout exceeded: ${url}`,
      });

      if (response.status !== 200) {
        this.logger.error(
          `${this.logPrefix} Error for ${metal}/${currency}: ${response.statusText}. Error: ${response.data}`,
        );
        return;
      }

      const pricePerGram = response.data.metals[metal.toLowerCase()];

      if (!pricePerGram) {
        this.logger.error(`${this.logPrefix} Missing price for ${metal} in ${currency}`);
        return;
      }

      this.logger.debug(`${this.logPrefix} resolved price per gram: ${metal}/${currency}: ${pricePerGram}`);

      await this.metalsDevApiDataRepository.save([
        {
          value: pricePerGram,
          timestamp: this.timeService.apply(),
          params: params[0],
        },
      ]);
    } catch (error) {
      this.logger.error(`${this.logPrefix} An error occurred while fetching metal prices: ${error}`);
    }
  }

  private async getInput(): Promise<MetalsDevApiPriceInputParams[]> {
    const key = `${FetcherName.MetalPriceApi}_cachedParams`;

    const cache = await this.mappingRepository.get(key);
    const cachedParams = JSON.parse(cache || '{}');

    return Object.keys(cachedParams).map((data) => {
      const [metal, currency] = data.split(';');
      return {metal, currency};
    });
  }
}
