import {expect} from 'chai';
import mongoose from 'mongoose';

import {LoggerBase, Pool, SovrynPoolScanner} from '../../src/services/sovryn/SovrynPoolScanner.js';
import {PoolRepositoryBase, SearchToken, SovrynPoolRepository} from '../../src/services/sovryn/SovrynPoolRepository.js';
import {GraphClient, GraphClientBase} from '../../src/services/graph/GraphClient.js';
import {ChainsIds} from '../../src/types/ChainsIds.js';

class MockLogger extends LoggerBase {
  message: string = '';
  error(message: string): void {
    this.message = message;
  }
}

const mockedLogger = new MockLogger();

class MockGraphClient extends GraphClientBase {
  queryResponse: unknown;

  constructor(queryResponse: unknown) {
    super();
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
      const graphClient = new MockGraphClient({});
      const poolRepository = new MockPoolRepository();
      const scanner = new SovrynPoolScanner(graphClient, poolRepository, mockedLogger);

      expect(scanner !== undefined);
    });

    it('scans available pools', async () => {
      const p1: Pool = {
        address: '0x11111111111111111111',
        token0: '0x11111111111111111111',
        token1: '0x11111111111111111111',
      };
      const p2: Pool = {
        address: '0x22222222222222222222',
        token0: '0x22222222222222222222',
        token1: '0x22222222222222222222',
      };
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
      const graphClient = new MockGraphClient(queryResponse);
      const poolRepository = new MockPoolRepository();
      const scanner = new SovrynPoolScanner(graphClient, poolRepository, mockedLogger);

      const pools = await scanner.scanPools('http://subgraphUrl');
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
      const graphClient = new MockGraphClient(queryResponse);
      const poolRepository = new MockPoolRepository();
      const scanner = new SovrynPoolScanner(graphClient, poolRepository, mockedLogger);

      const pools = await scanner.scanPools('http://subgraphUrl');
      expect(pools).to.eql([]);
      expect(mockedLogger.message).to.contain(
        '[SovrynPoolScanner] Failed to convert JSON query response into SovrynPoolsQueryResponse object',
      );
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
      const graphClient = new MockGraphClient(queryResponse);
      const poolRepository = new MockPoolRepository();
      const scanner = new SovrynPoolScanner(graphClient, poolRepository, mockedLogger);

      const pools = await scanner.scanPools('http://subgraphUrl');
      expect(pools).to.eql([]);
      expect(mockedLogger.message).to.contain(
        '[SovrynPoolScanner] Failed to convert JSON query response into SovrynPoolsQueryResponse object',
      );
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

      const graphClient = new MockGraphClient(queryResponse);
      const poolRepository = new MockPoolRepository();
      const scanner = new SovrynPoolScanner(graphClient, poolRepository, mockedLogger);

      const pools = await scanner.scanPools('http://subgraphUrl');
      expect(pools).to.eql([]);
      expect(mockedLogger.message).to.contain(
        '[SovrynPoolScanner] Failed to convert JSON query response into SovrynPoolsQueryResponse object',
      );
    });

    it('returns an empty pool array even if the graph client fails catastrophically', async () => {
      const graphClient = new MockGraphClient({});
      graphClient.query = () => {
        throw new Error('Query failed');
      };

      const poolRepository = new MockPoolRepository();
      const scanner = new SovrynPoolScanner(graphClient, poolRepository, mockedLogger);

      const pools = await scanner.scanPools('http://subgraphUrl');
      expect(pools).to.eql([]);
      expect(mockedLogger.message).to.contain('[SovrynPoolScanner] Failed to make query. Error: Query failed');
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
      const p1: Pool = {
        address: '0x11111111111111111111',
        token0: '0x11111111111111111111',
        token1: '0x11111111111111111111',
      };
      const p2: Pool = {
        address: '0x22222222222222222222',
        token0: '0x22222222222222222222',
        token1: '0x22222222222222222222',
      };
      const pools = [p1, p2];

      const graphClient = new MockGraphClient({});
      const poolRepository = new MockPoolRepository();
      const scanner = new SovrynPoolScanner(graphClient, poolRepository, mockedLogger);

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

describe.skip('SovrynPoolScanner-IntegrationTests', () => {
  it('runs the Sovryn pool scanner', async () => {
    const graphClient = new GraphClient();
    const sovrynPoolRepository = new SovrynPoolRepository();
    const scanner = new SovrynPoolScanner(graphClient, sovrynPoolRepository, mockedLogger);

    await mongoose.connect(process.env.MONGODB_URL as string, {useNewUrlParser: true, useUnifiedTopology: true});

    await scanner.run(ChainsIds.ROOTSTOCK, process.env.SOVRYN_SUBGRAPH_API as string);
  });
});
