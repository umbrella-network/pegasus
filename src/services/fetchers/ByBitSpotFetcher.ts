import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';
import {NumberOrUndefined} from 'src/types/fetchers.js';

export interface InputParams {
  symbol: string;
  category: string;
}

@injectable()
class ByBitSpotFetcher {
  @inject('Logger') protected logger!: Logger;

  private timeout: number;
  private environment: string | undefined;

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.byBit.timeout;
    this.environment = settings.environment;
  }

  async apply(inputs: InputParams[]): Promise<NumberOrUndefined[]> {
    const baseURL = this.environment !== 'testing' ? 'https://api.bybit.com' : 'https://api-testnet.bybit.com';
    const sourceUrl = `${baseURL}/v5/market/tickers?category=spot`;

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

    return this.resolveFeeds(inputs, response.data.result.list);
  }

  private resolveFeeds(inputs: InputParams[], priceList: Record<string, string>[]): NumberOrUndefined[] {
    const outputMap = new Map<string, NumberOrUndefined>();

    inputs.forEach((input) => {
      outputMap.set(input.symbol, undefined); // Using the index as the value here for demonstration
    });

    for (const price of priceList) {
      const symbolRead = price.symbol;

      if (outputMap.has(symbolRead)) {
        const priceValue = Number(price.usdIndexPrice);

        if (!priceValue || isNaN(priceValue)) {
          this.logger.error(`[ByBitSpotFetcher] Couldn't extract price for ${symbolRead}`);
          continue;
        }

        outputMap.set(symbolRead, priceValue);

        this.logger.debug(`[ByBitSpotFetcher] resolved price(usdIndexPrice): ${symbolRead}: ${priceValue}`);
      }
    }

    return inputs.map((input) => outputMap.get(input.symbol));
  }
}

export default ByBitSpotFetcher;
