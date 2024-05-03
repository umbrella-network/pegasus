export abstract class GraphQLClientBase {
  connected!: boolean;

  abstract connect(subgraphUrl: string): Promise<boolean>;
  abstract validateQuery(query: string): boolean;
  abstract query(query: string): Promise<unknown>;
}

interface PoolsQueryResponse {
  data: {
    liquidityPools: {
      id: string;
    }[];
  };
}

function isValidPoolQueryResponse(obj: any): obj is PoolsQueryResponse {
  // Perform necessary checks to validate the structure
  return (
    obj &&
    obj.data &&
    Array.isArray(obj.data.liquidityPools) &&
    obj.data.liquidityPools.every((pool: any) => pool.id && typeof pool.id === 'string')
  );
}

export class SovrynPoolScanner {
  client: GraphQLClientBase;

  constructor(client_: GraphQLClientBase) {
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
      const pools = <PoolsQueryResponse>response;
      return pools.data.liquidityPools.map((pool) => pool.id);
    } else {
      return [];
    }
  }
}
