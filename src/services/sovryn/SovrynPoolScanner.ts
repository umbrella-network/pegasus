import {Validator} from 'jsonschema';

import {GraphClientBase} from '../graph/GraphClient';
import {PoolRepositoryBase} from './SovrynPoolRepository.js';
import {SovrynGraphPoolsResponseJSONSchema} from './SovrynGraphResponseSchema.js';
import {liquidityPoolsQuery} from './SovrynGraphQueries.js';

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
  token0?: string;
  token1?: string;
  fee?: number;
  chainId?: string;
  dexProtocol?: string;
};

export class SovrynPoolScanner {
  client: GraphClientBase;
  repository: PoolRepositoryBase;

  constructor(client: GraphClientBase, repository: PoolRepositoryBase) {
    this.client = client;
    this.repository = repository;
  }

  connected(): boolean {
    return this.client.connected;
  }

  async scanPools(): Promise<Pool[]> {
    const response = await this.client.query(liquidityPoolsQuery);

    if (SovrynPoolScanner.isSovrynPoolsQueryResponse(response)) {
      const pools = <SovrynPoolsQueryResponse>response;
      return pools.data.liquidityPools.map((pool) => {
        return {address: pool.id};
      });
    } else {
      return [];
    }
  }

  async run(): Promise<boolean> {
    const pools = await this.scanPools();

    for (const pool of pools) {
      await this.repository.upsert(pool);
    }

    return Promise.resolve(true);
  }

  static isSovrynPoolsQueryResponse(obj_: unknown): obj_ is SovrynPoolsQueryResponse {
    const validator = new Validator();
    const result = validator.validate(obj_, SovrynGraphPoolsResponseJSONSchema);
    return result.valid;
  }
}
