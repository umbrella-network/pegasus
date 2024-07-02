import {inject, injectable} from 'inversify';

import {FeedFetcher} from '../../types/Feed.js';
import {FeedMultiProcessorInterface, StringOrUndefined, FetcherName} from '../../types/fetchers.js';
import UniswapV3MultiFetcher, {
  OutputValues,
  UniswapV3MultiFetcherParams,
} from '../dexes/uniswapV3/UniswapV3MultiFetcher.js';

interface FeedFetcherParams {
  base: string;
  quote: string;
}

@injectable()
export default class UniswapV3MultiProcessor implements FeedMultiProcessorInterface {
  @inject(UniswapV3MultiFetcher) uniswapV3MultiFetcher!: UniswapV3MultiFetcher;

  async apply(feedFetchers: FeedFetcher[]): Promise<StringOrUndefined[]> {
    const params = this.createParams(feedFetchers);
    const outputs = await this.uniswapV3MultiFetcher.apply(params);
    return this.sortOutput(feedFetchers, outputs);
  }

  private createParams(feedInputs: FeedFetcher[]): UniswapV3MultiFetcherParams[] {
    const params: UniswapV3MultiFetcherParams[] = [];

    feedInputs.forEach((fetcher) => {
      if (!fetcher.name.includes(FetcherName.UNISWAP_V3)) return;

      const {fromChain, base, quote, amountInDecimals} = fetcher.params as UniswapV3MultiFetcherParams;
      params.push({fromChain, base, quote, amountInDecimals});
    });

    return params;
  }

  private sortOutput(feedFetchers: FeedFetcher[], values: OutputValues[]): string[] {
    const inputsIndexMap: {[key: string]: number} = {};

    feedFetchers.forEach((fetcher, index) => {
      if (fetcher.name != FetcherName.UNISWAP_V3) return;

      const {base, quote} = fetcher.params as FeedFetcherParams;
      inputsIndexMap[this.getKey(base, quote)] = index;
    });

    const result: string[] = [];
    result.length = feedFetchers.length;

    values.forEach(({base, quote, value}) => {
      const index = inputsIndexMap[this.getKey(base, quote)];

      if (index !== undefined) {
        result[index] = value;
      }
    });

    return result;
  }

  private getKey(base: string, quote: string): string {
    return `${base}:${quote}`;
  }
}
