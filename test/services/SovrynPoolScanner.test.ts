import {expect} from 'chai';
import {SovrynPoolScanner} from '../../src/services/sovryn/SovrynPoolScanner.js';
import {GraphClientBase} from '../../src/services/graph/GraphClient.js';

class MockGraphClient extends GraphClientBase {
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
    const client = new MockGraphClient(true, {});
    const scanner = new SovrynPoolScanner(client);

    expect(scanner !== undefined);
  });

  it('connects to the subgraph', async () => {
    const client = new MockGraphClient(true, {});
    const scanner = new SovrynPoolScanner(client);

    let validSubgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    const connected = await scanner.connect(validSubgraphUrl);

    expect(connected).to.be.true;
  });

  it('fails to connect to the subgraph with invalid url', async () => {
    const client = new MockGraphClient(false, {});
    const scanner = new SovrynPoolScanner(client);

    let invalidSubgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    const connected = await scanner.connect(invalidSubgraphUrl);

    expect(connected).to.be.false;
  });

  it('scans available pools', async () => {
    const p1 = '0x11111111111111111111';
    const p2 = '0x22222222222222222222';
    const expected = [p1, p2];

    const queryResponse = {
      data: {
        liquidityPools: [
          {
            id: p1,
          },
          {
            id: p2,
          },
        ],
      },
    };
    const client = new MockGraphClient(false, queryResponse);
    const scanner = new SovrynPoolScanner(client);

    const pools = await scanner.scanPools();
    expect(pools).to.eql(expected);
  });

  it('fails to scan pools when the client response is bad formed - case 1', async () => {
    const queryResponse = {
      data: {
        liquidityPoolsBadName: [
          {
            id: '0x11111111111111111111',
          },
        ],
      },
    };
    const client = new MockGraphClient(false, queryResponse);
    const scanner = new SovrynPoolScanner(client);

    const pools = await scanner.scanPools();
    expect(pools).to.eql([]);
  });

  it('fails to scan pools when the client response is bad formed - case 2', async () => {
    const queryResponse = {
      data: {
        liquidityPools: [
          {
            idBadName: '0x11111111111111111111',
          },
        ],
      },
    };
    const client = new MockGraphClient(false, queryResponse);
    const scanner = new SovrynPoolScanner(client);

    const pools = await scanner.scanPools();
    expect(pools).to.eql([]);
  });

  it('fails to scan pools when the client response is bad formed - case 3', async () => {
    const queryResponse = {
      dataBadName: {
        liquidityPools: [
          {
            id: '0x11111111111111111111',
          },
        ],
      },
    };
    const client = new MockGraphClient(false, queryResponse);
    const scanner = new SovrynPoolScanner(client);

    const pools = await scanner.scanPools();
    expect(pools).to.eql([]);
  });
});
