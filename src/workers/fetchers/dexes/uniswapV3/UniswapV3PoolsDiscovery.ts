import {inject, injectable} from 'inversify';

import {SavePoolParams, UniswapV3PoolRepository} from '../../../../repositories/UniswapV3PoolRepository.js';
import {ChainsIds} from '../../../../types/ChainsIds.js';
import {UniswapV3Param} from './interfaces.js';
import {DexProtocolName} from '../../../../types/Dexes.js';
import {UniswapV3FeedsGetter} from './UniswapV3FeedsGetter.js';
import {GraphPaginator} from '../../../../services/graph/GraphPaginator.js';
import {SubgraphPoolResult, uniswapPoolsSubgraphQuery} from './GraphQueries.js';

@injectable()
export class UniswapV3PoolsDiscovery extends GraphPaginator {
  @inject(UniswapV3FeedsGetter) uniswapV3FeedsGetter!: UniswapV3FeedsGetter;
  @inject(UniswapV3PoolRepository) uniswapV3PoolRepository!: UniswapV3PoolRepository;

  readonly protocol = DexProtocolName.UNISWAP_V3;
  readonly logPrefix = '[UniswapV3PoolsDiscovery]';

  async apply(chainId: ChainsIds): Promise<void> {
    const uniswapV3Params = await this.uniswapV3FeedsGetter.apply(chainId);

    if (uniswapV3Params.length === 0) {
      this.logger.info(`${this.logPrefix}[${chainId}] No params for pool discovery`);
      return;
    }

    const data = await this.pullData<SubgraphPoolResult>(chainId, {uniswapV3Params});
    const poolstoSave = this.processSubgraphResponseData(chainId, data);
    await this.savePools(poolstoSave);
  }

  protected constructQuery(args: {uniswapV3Params: UniswapV3Param[]; limit: number; skip: number}): string {
    return uniswapPoolsSubgraphQuery(args.uniswapV3Params, args.limit, args.skip);
  }

  protected dataKey(): string {
    return 'pools';
  }

  protected getSubgraphURL(chainId: ChainsIds): string {
    return this.settings.dexes?.[chainId]?.[DexProtocolName.UNISWAP_V3]?.subgraphUrl || '';
  }

  private processSubgraphResponseData(chainId: ChainsIds, subgraphData: SubgraphPoolResult[]): SavePoolParams[] {
    return subgraphData.map((r) => {
      return <SavePoolParams>{
        chainId,
        address: r.id,
        fee: r.feeTrier,
        token0: r.token0.id,
        token1: r.token1.id,
        protocol: DexProtocolName.UNISWAP_V3,
      };
    });
  }

  private async savePools(pools: SavePoolParams[]): Promise<void> {
    const saved = await Promise.allSettled(pools.map((p) => this.uniswapV3PoolRepository.savePool(p)));

    saved.forEach((r, ix) => {
      if (r.status === 'rejected') {
        this.logger.error(`${this.logPrefix} Failed to save pool: ${r.reason}, ${JSON.stringify(pools[ix])}`);
      }
    });
  }
}
