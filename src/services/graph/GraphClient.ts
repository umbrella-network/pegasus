import {Client, cacheExchange, fetchExchange} from '@urql/core';

export abstract class GraphClientBase {
  abstract query(subgraphUrl: string, query: string): Promise<unknown>;
}

export class GraphClient extends GraphClientBase {
  // For now we only allow queries w/o variables
  async query(subgraphUrl: string, query: string): Promise<unknown> {
    const client = new Client({
      url: subgraphUrl,
      exchanges: [cacheExchange, fetchExchange],
    });
    return client.query(query, {});
  }
}
