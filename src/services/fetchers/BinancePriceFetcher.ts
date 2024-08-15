import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import Settings from '../../types/Settings.js';
import TimeService from '../../services/TimeService.js';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherResult,
  FetcherName,
  FetchedValueType,
} from '../../types/fetchers.js';

import {BinanceDataRepository} from '../../repositories/fetchers/BinanceDataRepository.js';

export interface BinancePriceInputParams {
  symbol: string;
  inverse: boolean;
}

type BinanceResponse = {symbol: string; price: string};
type ParsedResponse = {symbol: string; price: number};

@injectable()
export class BinancePriceFetcher implements FeedFetcherInterface {
  @inject(BinanceDataRepository) binanceDataRepository!: BinanceDataRepository;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private timeout: number;
  private logPrefix = `[${FetcherName.BinancePrice}]`;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.binance.timeout;
  }

  async apply(inputs: BinancePriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    const sourceUrl = 'https://www.binance.com/api/v3/ticker/price';

    this.logger.debug(`${this.logPrefix} call for: ${sourceUrl}`);

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
    });

    const parsed = this.parseResponse(response);
    await this.savePrices(this.timeService.apply(), parsed);

    const prices = await this.binanceDataRepository.getPrices(inputs, options.timestamp);

    const fetcherResults: FetcherResult = {
      prices: prices.map((price, ix) =>
        price !== undefined && price != 0 && inputs[ix].inverse ? 1.0 / price : price,
      ),
      timestamp: options.timestamp,
    };

    await this.priceDataRepository.saveFetcherResults(
      fetcherResults,
      options.symbols,
      FetcherName.BinancePrice,
      FetchedValueType.Price,
      BinancePriceFetcher.fetcherSource,
    );

    return fetcherResults;
  }

  private parseResponse(axiosResponse: AxiosResponse): ParsedResponse[] {
    if (axiosResponse.status !== 200) {
      this.logger.error(`${this.logPrefix} status ${axiosResponse.status}`);
      return [];
    }

    return (axiosResponse.data as BinanceResponse[])
      .map(({symbol, price}) => {
        const value = parseFloat(price);

        if (isNaN(value)) {
          this.logger.warn(`${this.logPrefix} NaN: ${symbol}: ${price}`);
          return;
        }

        this.logger.debug(`${this.logPrefix} fetched ${symbol}: ${value}`);

        return {symbol, price: value};
      })
      .filter((e) => !!e) as ParsedResponse[];
  }

  private async savePrices(timestamp: number, parsed: ParsedResponse[]): Promise<void> {
    const allData = parsed.map((data) => {
      return {
        timestamp,
        value: data.price,
        params: {
          symbol: data.symbol,
          inverse: false,
        },
      };
    });

    await this.binanceDataRepository.save(allData);
  }
}
