import {cacheExchange, Client, fetchExchange} from '@urql/core';
import {injectable} from 'inversify';

@injectable()
export abstract class GraphClientBase {
  abstract query(subgraphUrl: string, query: string): Promise<unknown>;
}

@injectable()
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
