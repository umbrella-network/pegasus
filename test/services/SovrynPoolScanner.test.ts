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

describe('SovrynPoolScanner', () => {
  describe('scans pools using a graph client', () => {
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

      expect(scanner.connected()).to.be.true;
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
              poolTokens: [
                {
                  name: '(WR)BTC/RIF Liquidity Pool',
                },
              ],
              token0: {
                id: p1.address,
              },
              token1: {
                id: p1.address,
              },
            },
            {
              id: p2.address,
              poolTokens: [
                {
                  name: '(WR)BTC/RIF Liquidity Pool',
                },
              ],
              token0: {
                id: p2.address,
              },
              token1: {
                id: p2.address,
              },
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

  describe('stores pools in pool repository', () => {
    //const
  });
});
