import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {GraphClient} from '../../graph/GraphClient.js';
import {liquidityPoolsQuery} from './UniswapV3GraphQueries.js';
import {GraphTick, LiquidityTick} from './interfaces.js';
import Settings from '../../../types/Settings.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {DexProtocolName} from '../../../types/Dexes.js';

@injectable()
export class UniswapV3TickQuery {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;
  readonly graphClient;

  constructor() {
    this.graphClient = new GraphClient();
  }

  async apply(poolAddress: string, chainId: ChainsIds): Promise<GraphTick[]> {
    let allTicks: GraphTick[] = [];
    let skip = 0;
    let loadingTicks = true;
    const limit = 1000;

    while (loadingTicks) {
      const ticks = await this.getTickDataFromSubgraph(poolAddress, chainId, skip);
      allTicks = allTicks.concat(ticks);

      if (ticks.length < limit) {
        loadingTicks = false;
      } else {
        skip += limit;
      }
    }

    return allTicks;
  }

  private async getTickDataFromSubgraph(poolAddress: string, chainId: ChainsIds, skip: number): Promise<GraphTick[]> {
    try {
      const subgraphURL = this.settings.dexes?.[DexProtocolName.UNISWAP_V3]?.[chainId]?.subgraphUrl || '';

      const response = (await this.graphClient.query(subgraphURL, liquidityPoolsQuery(poolAddress, skip))) as {
        data: LiquidityTick;
      };

      return response.data.ticks;
    } catch (error) {
      this.logger.error(`[UniswapV3TickFetcher][${chainId}] Failed to make query. ${error}`);
      return [];
    }
  }
}
