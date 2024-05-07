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
  describe('scanPools', () => {
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

  describe('isSovrynPoolsQueryResponse', () => {
    it('validates a well-formed query response', () => {
      const response = {
        data: {
          liquidityPools: [
            {
              id: '0x1769044cba7ad37719bade16cc71ec3f027b943d',
              poolTokens: [
                {
                  name: '(WR)BTC/RIF Liquidity Pool',
                },
              ],
              token0: {
                id: '0x542fda317318ebf1d3deaf76e0b632741a7e677d',
              },
              token1: {
                id: '0x2acc95758f8b5f583470ba265eb685a8f45fc9d5',
              },
            },
            {
              id: '0x1d2c04967e8b17168310fd7035cc219de477be82',
              poolTokens: [
                {
                  name: '(WR)BTC/SOV Liquidity Pool',
                },
              ],
              token0: {
                id: '0x542fda317318ebf1d3deaf76e0b632741a7e677d',
              },
              token1: {
                id: '0xefc78fc7d48b64958315949279ba181c2114abbd',
              },
            },
          ],
        },
      };

      expect(SovrynPoolScanner.isSovrynPoolsQueryResponse(response)).to.be.true;
    });

    it('invalidates that a wrong-formed query response', () => {
      const response = {
        data: {
          liquidityPools: [
            {
              id: '0x1769044cba7ad37719bade16cc71ec3f027b943d',
              poolTokens: [
                {
                  name: '(WR)BTC/RIF Liquidity Pool',
                },
              ],
              token0: {
                id: '0x542fda317318ebf1d3deaf76e0b632741a7e677d',
              },
            },
          ],
        },
      };

      expect(SovrynPoolScanner.isSovrynPoolsQueryResponse(response)).to.be.false;
    });
  });

  describe('storePools', () => {
    it('stores pools in the pool repository', async () => {
      const p1 = {address: '0x11111111111111111111'};
      const p2 = {address: '0x22222222222222222222'};
      const pools = [p1, p2];

      const graphClient = new MockGraphClient(false, {});
      const poolRepository = new MockPoolRepository();
      const scanner = new SovrynPoolScanner(graphClient, poolRepository);

      await scanner.storePools(pools);

      const p1_result = await poolRepository.find({address: p1.address});
      const p2_result = await poolRepository.find({address: p2.address});

      expect(p1_result.length).to.equal(1);
      expect(p2_result.length).to.equal(1);

      const expected = [p1, p2];

      expect([p1_result[0], p2_result[0]]).to.eql(expected);
    });
  });
});
