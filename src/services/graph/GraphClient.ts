import {Client, cacheExchange, fetchExchange} from '@urql/core';

export abstract class GraphClientBase {
  client: unknown;
  connected!: boolean;

  abstract connect(subgraphUrl: string): Promise<boolean>;
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

  async query(query: string): Promise<unknown> {
    return (this.client as Client).query(query, {id: 'test'});
  }
}
