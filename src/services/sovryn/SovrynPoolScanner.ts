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

export class SovrynPoolScanner {
  client: GraphClientBase;

  constructor(client_: GraphClientBase) {
    this.client = client_;
  }

  async connect(subgraphUrl: string): Promise<boolean> {
    const connected = await this.client.connect(subgraphUrl);

    return connected;
  }

  connected(): boolean {
    return this.client.connected;
  }

  async scanPools(): Promise<string[]> {
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
      return pools.data.liquidityPools.map((pool) => pool.id);
    } else {
      return [];
    }
  }
}
