import {inject, injectable} from 'inversify';

import {FeedFetcher} from '../../types/Feed.js';
import {FeedFetcherInterface} from '../../types/fetchers.js';
import UniswapV3MultiFetcher, {UniswapV3MultiFetcherParams} from '../fetchers/UniswapV3MultiFetcher.js';

@injectable()
export default class UniswapV3MultiProcessor implements FeedFetcherInterface {
  @inject(UniswapV3MultiFetcher) uniswapV3MultiFetcher!: UniswapV3MultiFetcher;

  async apply(feedFetchers: FeedFetcher[]): Promise<(number | undefined)[]> {
    const params = this.createParams(feedFetchers);
    return await this.uniswapV3MultiFetcher.apply(params);
  }

  private createParams(feedInputs: FeedFetcher[]): UniswapV3MultiFetcherParams[] {
    const params: UniswapV3MultiFetcherParams[] = [];

    feedInputs.forEach((fetcher) => {
      if (!fetcher.name.includes('UniswapV3')) return;

      const {token0, token1} = fetcher.params as UniswapV3MultiFetcherParams;
      params.push({token0, token1});
    });

    return params;
  }
}
