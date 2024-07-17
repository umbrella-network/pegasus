import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';
import FetcherAPILimit from '../../types/FetcherAPILimit.js';
import {splitIntoBatches} from '../../utils/collections.js';
import {FeedFetcherInterface, NumberOrUndefined} from 'src/types/fetchers.js';

export interface InputParams {
  symbol: string;
}

@injectable()
export default class BinancePriceMultiFetcher implements FeedFetcherInterface {
  @inject('FetcherAPILimit') private fetcherAPILimit!: FetcherAPILimit;
  @inject('Logger') private logger!: Logger;

  private timeout: number;
  private maxBatchSize: number;

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.binance.timeout;
    this.maxBatchSize = settings.api.binance.maxBatchSize;
  }

  async apply(inputs: InputParams[]): Promise<NumberOrUndefined[]> {
    this.logger.debug(`fetcherAPILimit: ${JSON.stringify(this.fetcherAPILimit)}`);
    if (Date.now() <= this.fetcherAPILimit.binance.nextTry) {
      this.logger.warn(`[BinancePriceMultiFetcher] skip call, next try in ${this.fetcherAPILimit.binance.nextTry}`);
      return [];
    }

    const batchedInputs = <InputParams[][]>splitIntoBatches(inputs, this.maxBatchSize);

    const responses = await Promise.all(
      batchedInputs.map((inputs) => {
        const symbols = inputs.map((input) => '"' + input.symbol + '"').join(',');
        const url = `https://api.binance.com/api/v3/ticker/price?symbols=[${symbols}]`;

        this.logger.debug(`[BinancePriceMultiFetcher] call url: ${url}`);

        return axios.get(url, {
          timeout: this.timeout,
          timeoutErrorMessage: `Timeout exceeded: ${url}`,
          validateStatus: () => true,
        });
      }),
    );

    const dataResponses = responses.map((response) => response.data).flat();
    const prices = dataResponses.map((response) => response?.price);
    return prices;
  }
}
