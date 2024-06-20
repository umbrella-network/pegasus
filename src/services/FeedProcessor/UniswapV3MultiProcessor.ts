import {inject, injectable} from 'inversify';

import {FeedFetcher} from '../../types/Feed.js';
import {FeedFetcherInterface} from '../../types/fetchers.js';
import UniswapV3MultiFetcher, {OutputValues, UniswapV3MultiFetcherParams} from '../fetchers/UniswapV3MultiFetcher.js';

interface FeedFetcherParams {
  token0: string;
  token1: string;
}

@injectable()
export default class UniswapV3MultiProcessor implements FeedFetcherInterface {
  @inject(UniswapV3MultiFetcher) uniswapV3MultiFetcher!: UniswapV3MultiFetcher;

  async apply(feedFetchers: FeedFetcher[]): Promise<(number | undefined)[]> {
    const params = this.createParams(feedFetchers);
    const outputs = await this.uniswapV3MultiFetcher.apply(params);
    return this.sortOutput(feedFetchers, outputs);
  }

  private createParams(feedInputs: FeedFetcher[]): UniswapV3MultiFetcherParams[] {
    const params: UniswapV3MultiFetcherParams[] = [];

    feedInputs.forEach((fetcher) => {
      if (!fetcher.name.includes('UniswapV3')) return;

      const {chainFrom, token0, token1} = fetcher.params as UniswapV3MultiFetcherParams;
      params.push({chainFrom, token0, token1});
    });

    return params;
  }

  private sortOutput(feedFetchers: FeedFetcher[], values: OutputValues[]): number[] {
    const inputsIndexMap: {[key: string]: number} = {};

    feedFetchers.forEach((fetcher, index) => {
      const {token0, token1} = fetcher.params as FeedFetcherParams;
      inputsIndexMap[this.getKey(token0, token1)] = index;
    });

    const result: number[] = [];
    result.length = feedFetchers.length;

    values.forEach(({token0, token1, value}) => {
      const index = inputsIndexMap[this.getKey(token0, token1)];

      if (index !== undefined) {
        result[index] = value;
      }
    });

    return result;
  }

  private getKey(token0: string, token1: string) {
    return `${token0}:${token1}`;
  }
}
