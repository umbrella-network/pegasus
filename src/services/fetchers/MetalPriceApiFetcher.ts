import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import {FeedBaseQuote, FeedFetcherInterface, FetcherName} from '../../types/fetchers.js';
import Settings from '../../types/Settings.js';

const GRAMS_PER_TROY_OUNCE = 31.1035;

export interface MetalPriceApiInputParams {
  symbol: string;
  currency: string;
}

@injectable()
export default class MetalPriceApiFetcher implements FeedFetcherInterface {
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private apiKey: string;
  private timeout: number;

  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.metalPriceApi.apiKey;
    this.timeout = settings.api.metalPriceApi.timeout;
  }

  async apply(params: MetalPriceApiInputParams & FeedBaseQuote): Promise<number> {
    const {symbol, currency, feedBase, feedQuote} = params;
    this.logger.debug(`[MetalPriceApiFetcher] call for: ${symbol}/${currency}`);
    const apiUrl = 'https://api.metalpriceapi.com/v1/latest';

    const url = `${apiUrl}?api_key=${this.apiKey}&base=${currency}&currency=${currency}`;

    try {
      const response = await axios.get(url, {
        timeout: this.timeout,
        timeoutErrorMessage: `[MetalPriceApiFetcher] Timeout exceeded: ${url}`,
      });

      if (response.status !== 200) {
        this.logger.error(
          `[MetalPriceApiFetcher] Error fetching data for ${symbol}/${currency}: ${response.statusText}`,
        );
        throw new Error(response.data);
      }

      const rate = response.data.rates[currency];

      if (rate !== undefined) {
        const pricePerTroyOunce = 1 / rate;
        const pricePerGram = pricePerTroyOunce / GRAMS_PER_TROY_OUNCE;

        this.logger.debug(`[MetalPriceApiFetcher] resolved price per gram: ${symbol}/${currency}: ${pricePerGram}`);

        const payload: PriceDataPayload = {
          fetcher: FetcherName.METAL_PRICE_API,
          value: pricePerGram.toString(),
          valueType: PriceValueType.Price,
          timestamp: this.timeService.apply(),
          feedBase,
          feedQuote,
          fetcherSource: MetalPriceApiFetcher.fetcherSource,
        };

        await this.priceDataRepository.savePrice(payload);

        return pricePerGram;
      } else {
        throw new Error(`[MetalPriceApiFetcher] Missing rate for ${symbol}/${currency}`);
      }
    } catch (error) {
      this.logger.error(`[MetalPriceApiFetcher] An error occurred while fetching metal prices: ${error}`);
      throw new Error('Failed to fetch metal prices');
    }
  }
}
