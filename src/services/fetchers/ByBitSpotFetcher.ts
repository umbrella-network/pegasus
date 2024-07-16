import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';

type FeedValue = {fsym: string; tsym: string};

export type ByBitSpotFetcherParams = Map<string, FeedValue>;

export interface OutputValue {
  fsym: string;
  tsym: string;
  value: number;
}

@injectable()
class ByBitSpotFetcher {
  @inject('Logger') protected logger!: Logger;

  private timeout: number;
  private environment: string | undefined;
  private usdtCurrencyRegex: RegExp;

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.byBit.timeout;
    this.environment = settings.environment;
    this.usdtCurrencyRegex = /USDT$/;
  }

  async apply(inputs: ByBitSpotFetcherParams): Promise<OutputValue[]> {
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

    const feedValues = this.resolveFeeds(inputs, response.data.result.list);

    return feedValues ?? [];
  }

  private resolveFeeds(inputs: ByBitSpotFetcherParams, priceList: Record<string, string>[]): OutputValue[] {
    const outputs: OutputValue[] = [];
    const priceDatas = priceList.filter((entry: Record<string, string>) => this.filterFeeds(inputs, entry));

    this.logger.debug(`[ByBitSpotFetcher] Prices found: ${JSON.stringify(priceDatas)}`);

    priceDatas.forEach((priceData: Record<string, string>) => {
      const feed = this.getInputFeed(inputs, priceData)!;

      if (this.usdtCurrencyRegex.test(priceData.symbol) && this.isdUSDTFeed(inputs, priceData.symbol)) {
        // Some pairs doesn't have usdIndexPrice. e.g.: TAMAUSDT
        if (!priceData.usdIndexPrice) {
          this.logger.error(`[ByBitSpotFetcher] ${priceData.symbol}: No usd price`);
          return;
        }

        this.logger.debug(
          `[ByBitSpotFetcher] resolved price(usdIndexPrice): ${priceData.symbol}: ${priceData.usdIndexPrice}`,
        );

        outputs.push({tsym: feed.tsym, fsym: feed.fsym, value: Number(priceData.usdIndexPrice)});
        return;
      }

      if (!priceData.lastPrice) {
        this.logger.error(`[ByBitSpotFetcher] ${priceData.symbol}: No lastPrice`);
        return;
      }

      this.logger.debug(`[ByBitSpotFetcher] resolved price(lastPrice): ${priceData.symbol}: ${priceData.lastPrice}`);

      outputs.push({
        fsym: feed?.fsym,
        tsym: feed?.tsym,
        value: Number(priceData.lastPrice),
      });
    });

    return outputs;
  }

  private filterFeeds(inputs: ByBitSpotFetcherParams, entry: Record<string, string>) {
    return Boolean(this.getInputFeed(inputs, entry));
  }

  private getInputFeed(inputs: ByBitSpotFetcherParams, entry: Record<string, string>) {
    if (this.usdtCurrencyRegex.test(entry.symbol)) {
      const [symbol] = entry.symbol.split('USDT');
      return inputs.get(`${symbol}USD`) || inputs.get(entry.symbol);
    }

    return inputs.get(entry.symbol);
  }

  private isdUSDTFeed(inputs: ByBitSpotFetcherParams, symbol: string) {
    return inputs.has(`${symbol.split('USDT')?.[0]}USD`);
  }
}

export default ByBitSpotFetcher;
