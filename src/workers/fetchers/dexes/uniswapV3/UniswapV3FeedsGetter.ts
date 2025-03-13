import {inject, injectable} from 'inversify';
import {ChainsIds} from '../../../../types/ChainsIds.js';
import {FetcherName} from '../../../../types/fetchers.js';
import {UniswapV3Param} from './interfaces.js';
import {DeviationFeedsGetter} from '../../_common/DeviationFeedsGetter.js';

@injectable()
export class UniswapV3FeedsGetter {
  @inject(DeviationFeedsGetter) feedsGetter!: DeviationFeedsGetter;

  readonly logPrefix = '[UniswapV3FeedsGetter]';

  async apply(chainId: ChainsIds): Promise<UniswapV3Param[]> {
    const uniswapFeeds = await this.feedsGetter.apply<UniswapV3Param>(FetcherName.UniswapV3);
    return uniswapFeeds.filter((f) => f.fromChain == chainId) as UniswapV3Param[];
  }
}
