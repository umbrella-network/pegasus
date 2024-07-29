import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository, PriceValueType} from '../../repositories/PriceDataRepository.js';
import Settings from '../../types/Settings.js';
import TimeService from '../../services/TimeService.js';

import {
  FeedMultiFetcherInterface,
  FeedMultiFetcherOptions,
  FetcherResult,
  NumberOrUndefined,
  FetcherName,
} from '../../types/fetchers.js';

export interface InputParams {
  symbol: string;
  inverse: boolean;
}

export type BinanceResponse = {symbol: string; price: string}[];

@injectable()
export default class BinancePriceFetcher implements FeedMultiFetcherInterface {
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private timeout: number;
  private logPrefix = `[${FetcherName.BinancePrice}]`;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.binance.timeout;
  }

  async apply(inputs: InputParams[], options: FeedMultiFetcherOptions): Promise<FetcherResult> {
    const sourceUrl = 'https://www.binance.com/api/v3/ticker/price';

    this.logger.debug(`${this.logPrefix} call for: ${sourceUrl}`);

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    if (response.data.Response === 'Error') {
      throw new Error(response.data.Message);
    }

    const fetcherResult = {
      prices: this.resolveFeeds(inputs, response.data as BinanceResponse),
      timestamp: this.timeService.apply(),
    };

    await this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.BinancePrice,
      PriceValueType.Price,
      BinancePriceFetcher.fetcherSource,
    );

    return fetcherResult;
  }

  private resolveFeeds(inputs: InputParams[], binancePrices: BinanceResponse): NumberOrUndefined[] {
    const outputs: NumberOrUndefined[] = [];

    for (const input of inputs) {
      const price = binancePrices.find((elem) => elem.symbol == input.symbol)?.price;

      if (!price) {
        this.logger.error(`${this.logPrefix} Couldn't extract price for ${input.symbol}`);
        outputs.push(undefined);
      } else {
        const priceValue = input.inverse ? 1 / Number(price) : Number(price);

        this.logger.debug(`${this.logPrefix} resolved price: ${input.symbol}: ${priceValue}`);

        outputs.push(priceValue);
      }
    }

    return outputs;
  }
}
