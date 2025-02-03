import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {GraphClient} from '../../../../services/graph/GraphClient.js';
import {liquidityPoolsSubgraphQuery} from './GraphQueries.js';
import {GraphTick, LiquidityTick} from './interfaces.js';
import Settings from '../../../../types/Settings.js';
import {ChainsIds} from '../../../../types/ChainsIds.js';
import {DexProtocolName} from '../../../../types/Dexes.js';

@injectable()
export class UniswapV3TickQuery {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  readonly graphClient;
  readonly queryLimit = 1000;

  constructor() {
    this.graphClient = new GraphClient();
  }

  async apply(poolAddress: string, chainId: ChainsIds): Promise<GraphTick[]> {
    let allTicks: GraphTick[] = [];
    let skip = 0;
    let loadingTicks = true;

    while (loadingTicks) {
      const ticks = await this.getTickDataFromSubgraph(poolAddress, chainId, skip);
      allTicks = allTicks.concat(ticks);

      if (ticks.length < this.queryLimit) {
        loadingTicks = false;
      } else {
        skip += this.queryLimit;
      }
    }

    return allTicks;
  }

  private async getTickDataFromSubgraph(poolAddress: string, chainId: ChainsIds, skip: number): Promise<GraphTick[]> {
    try {
      const subgraphURL = this.settings.dexes?.[chainId]?.[DexProtocolName.UNISWAP_V3]?.subgraphUrl || '';

      const response = (await this.graphClient.query(
        subgraphURL,
        liquidityPoolsSubgraphQuery(poolAddress, this.queryLimit, skip),
      )) as {
        data: LiquidityTick;
      };

      return response.data.ticks;
    } catch (error) {
      this.logger.error(`[UniswapV3TickFetcher][${chainId}] Failed to make query. ${error}`);
      return [];
    }
  }
}
