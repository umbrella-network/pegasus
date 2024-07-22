import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';
import {FeedFetcherInterface, FetcherResult, NumberOrUndefined} from 'src/types/fetchers.js';

export interface InputParams {
  symbol: string;
}

@injectable()
class ByBitSpotFetcher implements FeedFetcherInterface {
  @inject('Logger') protected logger!: Logger;

  private timeout: number;

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.byBit.timeout;
  }

  async apply(inputs: InputParams[]): Promise<FetcherResult> {
    const sourceUrl = 'https://api.bybit.com/v5/market/tickers?category=spot';

    this.logger.debug(`[ByBitSpotFetcher] call for: ${sourceUrl}`);

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

    return {prices: this.resolveFeeds(inputs, response.data.result.list)};
  }

  private resolveFeeds(inputs: InputParams[], priceList: Record<string, string>[]): NumberOrUndefined[] {
    const outputMap = new Map<string, NumberOrUndefined>();

    inputs.forEach((input) => {
      outputMap.set(input.symbol, undefined);
    });

    for (const price of priceList) {
      if (outputMap.has(price.symbol)) {
        const priceValue = Number(price.usdIndexPrice);

        if (!priceValue || isNaN(priceValue)) {
          this.logger.error(`[ByBitSpotFetcher] Couldn't extract price for ${price.symbol}`);
          continue;
        }

        outputMap.set(price.symbol, priceValue);

        this.logger.debug(`[ByBitSpotFetcher] resolved price(usdIndexPrice): ${price.symbol}: ${priceValue}`);
      }
    }

    return inputs.map((input) => outputMap.get(input.symbol));
  }
}

export default ByBitSpotFetcher;
