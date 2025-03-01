import {inject, injectable} from 'inversify';

import {UniswapV3PoolRepository} from '../../../../repositories/UniswapV3PoolRepository.js';
import {ChainsIds} from '../../../../types/ChainsIds.js';
import {TokenRepository} from '../../../../repositories/TokenRepository.js';
import {UniswapV3Param} from './interfaces.js';
import {DexProtocolName} from '../../../../types/Dexes.js';
import {UniswapV3FeedsGetter} from './UniswapV3FeedsGetter.js';
import {SubgraphLiquidityResult, uniswapLiquiditySubgraphQuery} from './GraphQueries.js';
import {GraphPaginator} from '../../../../services/graph/GraphPaginator.js';

@injectable()
export class UniswapV3LiquidityResolver extends GraphPaginator {
  @inject(UniswapV3FeedsGetter) uniswapV3FeedsGetter!: UniswapV3FeedsGetter;
  @inject(TokenRepository) tokenRepository!: TokenRepository;
  @inject(UniswapV3PoolRepository) uniswapV3PoolRepository!: UniswapV3PoolRepository;

  readonly protocol = DexProtocolName.UNISWAP_V3;
  readonly logPrefix = '[UniswapV3LiquidityResolver]';

  async apply(chainId: ChainsIds): Promise<void> {
    const uniswapV3Params = await this.uniswapV3FeedsGetter.apply(chainId);

    if (uniswapV3Params.length === 0) {
      this.logger.info(`${this.logPrefix}[${chainId}] No params for liquidity fetcher`);
      return;
    }

    const pools = await this.getPoolsForFeeds(chainId, uniswapV3Params);

    if (pools.length == 0) {
      this.logger.info(`${this.logPrefix}[${chainId}] No pools for liquidity fetcher`);
      return;
    }

    this.logger.debug(`${this.logPrefix}[${chainId}] liquidity for ${JSON.stringify(uniswapV3Params)} will be fetched`);

    const data = await this.pullData<SubgraphLiquidityResult>(chainId, {pools});
    await this.processSubgraphResponseData(chainId, data);
  }

  protected async getPoolsForFeeds(chainId: ChainsIds, uniswapV3Params: UniswapV3Param[]): Promise<string[]> {
    const pools = await this.uniswapV3PoolRepository.find({
      protocol: DexProtocolName.UNISWAP_V3,
      fromChain: chainId,
      tokens: uniswapV3Params.map((p) => {
        return {
          base: p.base,
          quote: p.quote,
        };
      }),
    });

    return pools.map((p) => p.address);
  }

  private async processSubgraphResponseData(
    chainId: ChainsIds,
    subgraphData: SubgraphLiquidityResult[],
  ): Promise<void> {
    const results = await Promise.allSettled(
      subgraphData.map((r) =>
        this.uniswapV3PoolRepository.saveLiquidity(
          {address: r.id, chainId},
          {
            liquidityLockedToken0: r.totalValueLockedToken0,
            liquidityLockedToken1: r.totalValueLockedToken1,
          },
        ),
      ),
    );

    results.forEach((r, ix) => {
      if (r.status === 'rejected') {
        this.logger.error(`${this.logPrefix} Failed to save liquidity for ${subgraphData[ix].id}: ${r.reason}`);
      } else {
        this.logger.debug(`${this.logPrefix} Liquidity saved: ${JSON.stringify(subgraphData[ix])}`);
      }
    });
  }

  protected constructQuery(args: {pools: string[]; limit: number; skip: number}): string {
    return uniswapLiquiditySubgraphQuery(args.pools, args.limit, args.skip);
  }

  protected dataKey(): string {
    return 'pools';
  }

  protected getSubgraphURL(chainId: ChainsIds): string {
    return this.settings.dexes?.[chainId]?.[DexProtocolName.UNISWAP_V3]?.subgraphUrl || '';
  }
}
