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
      query(_query: string): Promise<unknown> {
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
      query(_query: string): Promise<unknown> {
        return Promise.resolve({});
      }
    }

    const client = new MockClient();
    const scanner = new SovrynPoolScanner(client);

    let validSubgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    const connected = await scanner.connect(validSubgraphUrl);

    expect(connected).to.be.true;
  });

  it('fails to connect to the subgraph with invalid url', async () => {
    class MockClient extends GraphQLClientBase {
      async connect(_subgraphUrl: string): Promise<boolean> {
        return Promise.resolve(false);
      }
      validateQuery(_query: string): boolean {
        return true;
      }
      query(_query: string): Promise<unknown> {
        return Promise.resolve({});
      }
    }

    const client = new MockClient();
    const scanner = new SovrynPoolScanner(client);

    let invalidSubgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    const connected = await scanner.connect(invalidSubgraphUrl);

    expect(connected).to.be.false;
  });

  it('scans available pools', async () => {
    const p1 = '0x11111111111111111111';
    const p2 = '0x22222222222222222222';
    const p3 = '0x33333333333333333333';
    const expected = [p1, p2, p3];

    class MockClient extends GraphQLClientBase {
      async connect(_subgraphUrl: string): Promise<boolean> {
        return Promise.resolve(true);
      }
      validateQuery(_query: string): boolean {
        return true;
      }
      query(_query: string): Promise<unknown> {
        const result = {
          data: {
            liquidityPools: [
              {
                id: p1,
                poolTokens: [
                  {
                    name: '(WR)BTC/RIF Liquidity Pool',
                  },
                ],
              },
              {
                id: p2,
                poolTokens: [
                  {
                    name: '(WR)BTC/SOV Liquidity Pool',
                  },
                ],
              },
              {
                id: p3,
                poolTokens: [
                  {
                    name: '(WR)BTC/ETHs Liquidity Pool',
                  },
                ],
              },
            ],
          },
        };
        return Promise.resolve(result);
      }
    }

    const client = new MockClient();
    const scanner = new SovrynPoolScanner(client);

    let subgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    await scanner.connect(subgraphUrl);

    const pools = await scanner.scanPools();

    expect(pools).to.eql(expected);
  });
});
