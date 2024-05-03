import {expect} from 'chai';
import {GraphQLClientBase, SovrynPoolScanner} from '../../src/services/sovryn/SovrynPoolScanner.js';

describe('SovrynPoolScanner', () => {
  it('creates a SovrynPoolScanner instance', async () => {
    class MockClient extends GraphQLClientBase {
      async connect(_subgraphUrl: string): Promise<boolean> {
        return Promise.resolve(true);
      }
      validateQuery(_query: string): boolean {
        return true;
      }
      query(_query: string): Promise<any> {
        return Promise.resolve({});
      }
    }

    const client = new MockClient();
    const scanner = new SovrynPoolScanner(client);

    expect(scanner !== undefined);
  });

  it('connects to the subgraph', async () => {
    class MockClient extends GraphQLClientBase {
      async connect(_subgraphUrl: string): Promise<boolean> {
        return Promise.resolve(true);
      }
      validateQuery(_query: string): boolean {
        return true;
      }
      query(_query: string): Promise<any> {
        return Promise.resolve({});
      }
    }

    const client = new MockClient();
    const scanner = new SovrynPoolScanner(client);

    let validSubgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    await scanner.connect(validSubgraphUrl);

    expect(scanner.connected()).to.be.true;
  });

  it('fails to connect to the subgraph with invalid url', async () => {
    class MockClient extends GraphQLClientBase {
      async connect(_subgraphUrl: string): Promise<boolean> {
        return Promise.resolve(true);
      }
      validateQuery(_query: string): boolean {
        return true;
      }
      query(_query: string): Promise<any> {
        return Promise.resolve({});
      }
    }

    const client = new MockClient();
    const scanner = new SovrynPoolScanner(client);

    let invalidSubgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    await scanner.connect(invalidSubgraphUrl);

    expect(scanner.connected()).to.be.false;
  });

  it('scans available pools', async () => {
    class MockClient extends GraphQLClientBase {
      async connect(_subgraphUrl: string): Promise<boolean> {
        return Promise.resolve(true);
      }
      validateQuery(_query: string): boolean {
        return true;
      }
      query(_query: string): Promise<any> {
        return Promise.resolve({});
      }
    }

    const client = new MockClient();
    const scanner = new SovrynPoolScanner(client);

    let subgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    await scanner.connect(subgraphUrl);

    const expected = ['0x47283'];

    const pools = await scanner.scanPools();

    expect(pools).to.eql(expected);
  });
});
