import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherName,
  FetcherResult,
  FetchedValueType,
} from '../../types/fetchers.js';

import Settings from '../../types/Settings.js';
import {MetalPriceApiDataRepository} from '../../repositories/fetchers/MetalPriceApiDataRepository.js';
import TimeService from '../TimeService.js';

const GRAMS_PER_TROY_OUNCE = 31.1035;

export interface MetalPriceApiInputParams {
  symbol: string;
  currency: string;
}

@injectable()
export class MetalPriceApiFetcher implements FeedFetcherInterface {
  @inject(MetalPriceApiDataRepository) private metalPriceApiDataRepository!: MetalPriceApiDataRepository;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private apiKey: string;
  private timeout: number;
  private logPrefix = `[${FetcherName.MetalPriceApi}]`;

  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.metalPriceApi.apiKey;
    this.timeout = settings.api.metalPriceApi.timeout;
  }

  async apply(params: MetalPriceApiInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    try {
      await this.fetchPrices(params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }

    const {symbols} = options;

    const [price] = await this.metalPriceApiDataRepository.getPrices(params, options.timestamp);
    const result = {prices: [price], timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      result,
      symbols,
      FetcherName.MetalsDevApi,
      FetchedValueType.Price,
      MetalPriceApiFetcher.fetcherSource,
    );

    return result;
  }

  private async fetchPrices(params: MetalPriceApiInputParams[]): Promise<void> {
    if (params.length != 1) throw new Error(`${this.logPrefix} not a multifetcher: ${params}`);

    const {symbol, currency} = params[0];

    this.logger.debug(`${this.logPrefix} call for: ${symbol}/${currency}`);

    const apiUrl = 'https://api.metalpriceapi.com/v1/latest';
    const url = `${apiUrl}?api_key=${this.apiKey}&base=${currency}&currency=${currency}`;

    try {
      const response = await axios.get(url, {
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

      const rate = response.data?.rates[symbol];

      if (!rate) {
        this.logger.error(`${this.logPrefix} Missing rate for ${symbol}/${currency}`);
        return;
      }

      const pricePerTroyOunce = 1 / rate;
      const pricePerGram = pricePerTroyOunce / GRAMS_PER_TROY_OUNCE;

      this.logger.debug(`${this.logPrefix} resolved price per gram: ${symbol}/${currency}: ${pricePerGram}`);

      await this.metalPriceApiDataRepository.save([
        {
          value: pricePerGram,
          timestamp: this.timeService.apply(),
          params: params[0],
        },
      ]);
    } catch (error) {
      this.logger.error(`${this.logPrefix} An error occurred while fetching metal prices: ${error}`);
      return;
    }
  }
}
