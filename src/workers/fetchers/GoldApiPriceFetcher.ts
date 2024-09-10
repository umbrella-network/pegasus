import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import axios from 'axios';

import {ServiceInterface} from '../../types/fetchers.js';

import Settings from '../../types/Settings.js';
import TimeService from '../../services/TimeService.js';
import {GoldApiDataRepository} from '../../repositories/fetchers/GoldApiDataRepository.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';
import {FetchersMappingCacheKeys} from '../../services/fetchers/common/FetchersMappingCacheKeys.js';

export interface GoldApiPriceInputParams {
  symbol: string;
  currency: string;
}

@injectable()
export class GoldApiPriceFetcher implements ServiceInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(GoldApiDataRepository) private goldApiDataRepository!: GoldApiDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private token: string;
  private timeout: number;
  private logPrefix = '[GoldApiPriceService]';
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.token = settings.api.goldApi.apiKey;
    this.timeout = settings.api.goldApi.timeout;
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

  private async fetchPrices(params: GoldApiPriceInputParams[]): Promise<void> {
    if (params.length != 1) throw new Error(`${this.logPrefix} not a multifetcher: ${params}`);

    const {symbol, currency} = params[0];

    this.logger.debug(`${this.logPrefix} call for: ${symbol}/${currency}`);

    const url = `https://www.goldapi.io/api/${symbol}/${currency}`;

    const response = await axios.get(url, {
      headers: {'x-access-token': this.token},
      timeout: this.timeout,
      timeoutErrorMessage: `${this.logPrefix} Timeout exceeded: ${url}`,
    });

    if (response.status !== 200) {
      this.logger.error(
        `${this.logPrefix} Error fetching data for ${symbol}/${currency}: ${response.statusText}.` +
          `Error: ${response.data}`,
      );

      return;
    }

    const {price_gram_24k} = response.data;

    if (!price_gram_24k) {
      this.logger.error(`${this.logPrefix} Missing rate for ${symbol}/${currency}`);
      return;
    }

    this.logger.debug(`${this.logPrefix} resolved price: ${symbol}/${currency}: ${price_gram_24k}`);

    await this.goldApiDataRepository.save([
      {
        value: price_gram_24k,
        timestamp: this.timeService.apply(),
        params: params[0],
      },
    ]);
  }

  private async getInput(): Promise<GoldApiPriceInputParams[]> {
    const key = FetchersMappingCacheKeys.GOLD_API_PRICE_PARAMS;

    const cache = await this.mappingRepository.get(key);
    const cachedParams = JSON.parse(cache || '{}');

    return Object.keys(cachedParams).map((data) => {
      const [symbol, currency] = data.split(';');
      return {symbol, currency};
    });
  }
}
