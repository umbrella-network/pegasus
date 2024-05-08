import {Validator} from 'jsonschema';

import {GraphClientBase} from '../graph/GraphClient';
import {PoolRepositoryBase} from './SovrynPoolRepository.js';
import {SovrynGraphPoolsResponseJSONSchema} from './SovrynGraphResponseSchema.js';
import {liquidityPoolsQuery} from './SovrynGraphQueries.js';
import {ChainsIds} from 'src/types/ChainsIds';

interface SovrynPoolsQueryResponse {
  data: {
    liquidityPools: {
      id: string;
      poolTokens: {
        name: string;
      }[];
      token0: {
        id: string;
      };
      token1: {
        id: string;
      };
    }[];
  };
}

export type Pool = {
  address: string;
  token0: string;
  token1: string;
  fee?: number;
  chainId?: string;
  dexProtocol?: string;
};

export abstract class LoggerBase {
  abstract error(message: string): void;
}

export class SovrynPoolScanner {
  client: GraphClientBase;
  repository: PoolRepositoryBase;
  logger: LoggerBase;

  constructor(client: GraphClientBase, repository: PoolRepositoryBase, logger: LoggerBase) {
    this.client = client;
    this.repository = repository;
    this.logger = logger;
  }

  async scanPools(subgraphUrl: string): Promise<Pool[]> {
    let response;
    try {
      response = await this.client.query(subgraphUrl, liquidityPoolsQuery);
    } catch (error) {
      this.logger.error(`[SovrynPoolScanner] Failed to make query. ${error}`);
      return [];
    }

    if (SovrynPoolScanner.isSovrynPoolsQueryResponse(response)) {
      const pools = <SovrynPoolsQueryResponse>response;
      return pools.data.liquidityPools.map((pool) => {
        return {address: pool.id, token0: pool.token0.id, token1: pool.token1.id};
      });
    } else {
      this.logger.error(
        '[SovrynPoolScanner] Failed to convert JSON query response into SovrynPoolsQueryResponse object',
      );
      return [];
    }
  }

  async storePools(pools: Pool[]) {
    for (const pool of pools) {
      await this.repository.upsert(pool);
    }
  }

  async run(chainId: ChainsIds, subgraphUrl: string): Promise<boolean> {
    let pools = await this.scanPools(subgraphUrl);

    pools = pools.map((pool) => ({...pool, chainId}));

    this.storePools(pools);

    return Promise.resolve(true);
  }

  static isSovrynPoolsQueryResponse(obj_: unknown): obj_ is SovrynPoolsQueryResponse {
    const validator = new Validator();
    const result = validator.validate(obj_, SovrynGraphPoolsResponseJSONSchema);
    return result.valid;
  }
}
