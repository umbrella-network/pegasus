import {Client, cacheExchange, fetchExchange} from '@urql/core';

export abstract class GraphClientBase {
  client: unknown;
  connected!: boolean;

  abstract query(query: string): Promise<unknown>;
}

export class GraphClient extends GraphClientBase {
  constructor(subgraphUrl: string) {
    super();
    this.client = new Client({
      url: subgraphUrl,
      exchanges: [cacheExchange, fetchExchange],
    });
  }

  // For now we only allow queries w/o variables
  async query(query: string): Promise<unknown> {
    return (this.client as Client).query(query, {});
  }
}
