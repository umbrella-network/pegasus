import {expect} from 'chai';

import {Pool, SovrynPoolScanner} from '../../src/services/sovryn/SovrynPoolScanner.js';
import {PoolRepositoryBase, SearchToken} from '../../src/services/sovryn/SovrynPoolRepository.js';
import {GraphClientBase} from '../../src/services/graph/GraphClient.js';

class MockGraphClient extends GraphClientBase {
  connected: boolean;
  queryResponse: unknown;

  constructor(connected: boolean, queryResponse: unknown) {
    super();
    this.connected = connected;
    this.queryResponse = queryResponse;
  }

  async connect(): Promise<boolean> {
    return Promise.resolve(this.connected);
  }

  validateQuery(): boolean {
    return true;
  }

  query(): Promise<unknown> {
    return Promise.resolve(this.queryResponse);
  }
}

class MockPoolRepository extends PoolRepositoryBase {
  pools: {[key: string]: Pool} = {};

  async upsert(pool: Pool): Promise<boolean> {
    this.pools[pool.address] = pool;
    return Promise.resolve(true);
  }

  async find(searchToken: SearchToken): Promise<Pool[]> {
    if (searchToken.address in this.pools) {
      return Promise.resolve([this.pools[searchToken.address]]);
    } else {
      return Promise.resolve([]);
    }
  }
}

describe('SovrynPoolScanner - Scan Pools', () => {
  it('creates a SovrynPoolScanner instance', async () => {
    const graphClient = new MockGraphClient(true, {});
    const poolRepository = new MockPoolRepository();
    const scanner = new SovrynPoolScanner(graphClient, poolRepository);

    expect(scanner !== undefined);
  });

  it('connects to the subgraph', async () => {
    const graphClient = new MockGraphClient(true, {});
    const poolRepository = new MockPoolRepository();
    const scanner = new SovrynPoolScanner(graphClient, poolRepository);

    const validSubgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    const connected = await scanner.connect(validSubgraphUrl);

    expect(connected).to.be.true;
  });

  it('fails to connect to the subgraph with invalid url', async () => {
    const graphClient = new MockGraphClient(false, {});
    const poolRepository = new MockPoolRepository();
    const scanner = new SovrynPoolScanner(graphClient, poolRepository);

    const invalidSubgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    const connected = await scanner.connect(invalidSubgraphUrl);

    expect(connected).to.be.false;
  });

  it('scans available pools', async () => {
    const p1: Pool = {address: '0x11111111111111111111'};
    const p2: Pool = {address: '0x22222222222222222222'};
    const expected = [p1, p2];

    const queryResponse = {
      data: {
        liquidityPools: [
          {
            id: p1.address,
          },
          {
            id: p2.address,
          },
        ],
      },
    };
    const graphClient = new MockGraphClient(false, queryResponse);
    const poolRepository = new MockPoolRepository();
    const scanner = new SovrynPoolScanner(graphClient, poolRepository);

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
    const graphClient = new MockGraphClient(false, queryResponse);
    const poolRepository = new MockPoolRepository();
    const scanner = new SovrynPoolScanner(graphClient, poolRepository);

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
    const graphClient = new MockGraphClient(false, queryResponse);
    const poolRepository = new MockPoolRepository();
    const scanner = new SovrynPoolScanner(graphClient, poolRepository);

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
    const graphClient = new MockGraphClient(false, queryResponse);
    const poolRepository = new MockPoolRepository();
    const scanner = new SovrynPoolScanner(graphClient, poolRepository);

    const pools = await scanner.scanPools();
    expect(pools).to.eql([]);
  });
});
