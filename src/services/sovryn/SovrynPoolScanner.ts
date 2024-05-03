export abstract class GraphQLClientBase {
  connected!: boolean;

  abstract connect(subgraphUrl: string): Promise<boolean>;
  abstract validateQuery(query: string): boolean;
  abstract query(query: string): Promise<any>;
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
    return [];
  }
}
