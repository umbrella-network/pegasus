import {GraphClientBase} from '../graph/GraphClient';
import {PoolRepositoryBase} from './SovrynPoolRepository';

interface SovrynPoolsQueryResponse {
  data: {
    liquidityPools: {
      id: string;
    }[];
  };
}

export function isSovrynPoolsQueryResponse(obj_: unknown): obj_ is SovrynPoolsQueryResponse {
  const obj = obj_ as SovrynPoolsQueryResponse;
  return (
    obj &&
    typeof obj === 'object' &&
    typeof obj['data'] === 'object' &&
    Array.isArray(obj.data.liquidityPools) &&
    obj.data.liquidityPools.every((pool: {id: string}) => pool.id && typeof pool.id === 'string')
  );
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

  async connect(subgraphUrl: string): Promise<boolean> {
    const connected = await this.client.connect(subgraphUrl);

    return connected;
  }

  connected(): boolean {
    return this.client.connected;
  }

  async scanPools(): Promise<Pool[]> {
    const query = `
query MyQuery {
  liquidityPools(where: {poolTokens_: {name_not: ""}}) {

    id
  }
}
    `;
    const response = await this.client.query(query);

    if (isSovrynPoolsQueryResponse(response)) {
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
}
