import {expect} from 'chai';
import {GraphQLClientBase, SovrynPoolScanner} from '../../src/services/sovryn/SovrynPoolScanner.js';

class MockClient extends GraphQLClientBase {
  connected: boolean;
  queryResponse: unknown;

  constructor(connected: boolean, queryResponse: unknown) {
    super();
    this.connected = connected;
    this.queryResponse = queryResponse;
  }

  async connect(_subgraphUrl: string): Promise<boolean> {
    return Promise.resolve(this.connected);
  }
  validateQuery(_query: string): boolean {
    return true;
  }
  query(_query: string): Promise<unknown> {
    return Promise.resolve(this.queryResponse);
  }
}

describe('SovrynPoolScanner', () => {
  it('creates a SovrynPoolScanner instance', async () => {
    const client = new MockClient(true, {});
    const scanner = new SovrynPoolScanner(client);

    expect(scanner !== undefined);
  });

  it('connects to the subgraph', async () => {
    const client = new MockClient(true, {});
    const scanner = new SovrynPoolScanner(client);

    let validSubgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    const connected = await scanner.connect(validSubgraphUrl);

    expect(connected).to.be.true;
  });

  it('fails to connect to the subgraph with invalid url', async () => {
    const client = new MockClient(false, {});
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

    const queryResponse = {
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
    const client = new MockClient(false, queryResponse);

    const scanner = new SovrynPoolScanner(client);

    let subgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    await scanner.connect(subgraphUrl);

    const pools = await scanner.scanPools();

    expect(pools).to.eql(expected);
  });
});
