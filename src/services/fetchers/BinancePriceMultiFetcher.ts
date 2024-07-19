import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';
import {FeedFetcherInterface, NumberOrUndefined} from 'src/types/fetchers.js';

export interface InputParams {
  symbol: string;
  inverse: boolean;
}

export type BinanceResponse = {symbol: string; price: string}[];

@injectable()
export default class BinancePriceMultiFetcher implements FeedFetcherInterface {
  @inject('Logger') private logger!: Logger;

  private timeout: number;

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.binance.timeout;
  }

  async apply(inputs: InputParams[]): Promise<NumberOrUndefined[]> {
    const sourceUrl = 'https://www.binance.com/api/v3/ticker/price';

    this.logger.debug(`[BinanceFetcher] call for: ${sourceUrl}`);

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

    return this.resolveFeeds(inputs, response.data as BinanceResponse);
  }

  private resolveFeeds(inputs: InputParams[], binancePrices: BinanceResponse): NumberOrUndefined[] {
    const outputs: NumberOrUndefined[] = [];

    for (const input of inputs) {
      const price = binancePrices.find((elem) => elem.symbol == input.symbol)?.price;

      if (!price) {
        this.logger.error(`[BinanceFetcher] Couldn't extract price for ${input.symbol}`);
        outputs.push(undefined);
      } else {
        const priceValue = input.inverse ? 1 / Number(price) : Number(price);

        this.logger.debug(`[BinanceFetcher] resolved price: ${input.symbol}: ${priceValue}`);

        outputs.push(priceValue);
      }
    }

    return outputs;
  }
}
