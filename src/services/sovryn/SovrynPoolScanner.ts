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
      poolTokens: {name: string};
    }[];
  };
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
    poolTokens {
      name
    }
  }
}
    `;
    const result = await this.client.query(query);

    const pools = <PoolsQueryResponse>result;

    return pools.data.liquidityPools.map((pool) => pool.id);
  }
}
