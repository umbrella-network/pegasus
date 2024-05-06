import {GraphClientBase} from '../graph/GraphClient';

interface SovrynPoolsQueryResponse {
  data: {
    liquidityPools: {
      id: string;
    }[];
  };
}

function isValidPoolQueryResponse(obj: any): obj is SovrynPoolsQueryResponse {
  return (
    obj &&
    obj.data &&
    Array.isArray(obj.data.liquidityPools) &&
    obj.data.liquidityPools.every((pool: any) => pool.id && typeof pool.id === 'string')
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

export type SearchToken = {
  address: string;
  token0?: string;
  token1?: string;
  chainId?: string;
  dexProtocol?: string;
};

export abstract class PoolRepositoryBase {
  abstract upsert(pool: Pool): Promise<boolean>;
  abstract find(searchToken: SearchToken): Promise<Pool[]>;
}

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

    if (isValidPoolQueryResponse(response)) {
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
