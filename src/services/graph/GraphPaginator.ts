import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {GraphClient} from './GraphClient.js';
import Settings from '../../types/Settings.js';
import {ChainsIds} from '../../types/ChainsIds.js';

@injectable()
export abstract class GraphPaginator {
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;

  readonly graphClient;
  protected logPrefix = '[GraphPaginator]';

  constructor() {
    this.graphClient = new GraphClient();
  }

  async pullData<T>(chainId: ChainsIds, queryArgs: Record<string, unknown>): Promise<T[]> {
    let allData: T[] = [];
    let skip = 0;
    let pagination = true;
    const limit = 1000;

    while (pagination) {
      this.logger.debug(`${this.logPrefix}[${chainId}] limit: ${limit}, skip: ${skip}`);

      const query = this.constructQuery({...queryArgs, limit, skip});
      const data = await this.getDataFromSubgraph<T>(query, chainId);

      allData = allData.concat(data);

      if (data.length < limit) {
        pagination = false;
      } else {
        skip += limit;
      }
    }

    return allData;
  }

  protected abstract constructQuery(args: {limit: number; skip: number}): string;

  // eg. {data: [dataPath]: T[]} in response
  //{data: pools: T[]}
  protected abstract dataKey(): string;

  protected abstract getSubgraphURL(chainId: ChainsIds): string;

  private async getDataFromSubgraph<T>(query: string, chainId: ChainsIds): Promise<T[]> {
    const subgraphURL = this.getSubgraphURL(chainId) || '';

    if (!subgraphURL) {
      this.logger.error(`${this.logPrefix}[${chainId}] subgraph url not found`);
      return [];
    }

    try {
      const response = await this.graphClient.query(subgraphURL, query);
      const typedResponse = response as {data: Record<string, T[]>};
      return typedResponse.data[this.dataKey()] || [];
    } catch (error) {
      this.logger.error(`${this.logPrefix}[${chainId}] Failed to make query. ${error}`);
      return [];
    }
  }
}
