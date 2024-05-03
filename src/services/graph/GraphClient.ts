import {Client, cacheExchange, fetchExchange} from '@urql/core';

export abstract class GraphClientBase {
  client: unknown;
  connected!: boolean;

  abstract connect(subgraphUrl: string): Promise<boolean>;
  abstract validateQuery(query: string): boolean;
  abstract query(query: string): Promise<unknown>;
}

export class GraphClient extends GraphClientBase {
  async connect(subgraphUrl: string): Promise<boolean> {
    this.client = new Client({
      url: subgraphUrl,
      exchanges: [cacheExchange, fetchExchange],
    });

    // we can add here a check to the connection

    return Promise.resolve(true);
  }

  validateQuery(_query: string): boolean {
    return true;
  }

  async query(query_: string): Promise<unknown> {
    if (!this.validateQuery(query_)) {
      return Promise.resolve(false);
    }

    return (this.client as Client).query(query_, {id: 'test'});
  }
}
