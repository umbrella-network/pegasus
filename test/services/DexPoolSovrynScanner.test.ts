import {expect} from 'chai';

describe('Dex Pool Sovryn Scanner using TheGraph Protocol', () => {
  it('creates a Dex Pool Scanner instance', async () => {
    const scanner = new DexPoolScannerSovryn();

    expect(scanner !== undefined);
  });

  it('connects to the subgraph when the connection is valid', async () => {
    const scanner = new DexPoolScannerSovryn();

    let validSubgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    await scanner.connect(validSubgraphUrl);

    expect(scanner.connected()).to.be.true;
  });

  it('fails to connect to the subgraph when the subgraph url is invalid', async () => {
    const scanner = new DexPoolScannerSovryn();

    let invalidSubgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    await scanner.connect(invalidSubgraphUrl);

    expect(scanner.connected()).to.be.false;
  });

  it('scans the available pools using the scanner', async () => {
    const scanner = new DexPoolScannerSovryn();

    let subgraphUrl = 'https://eth.network.thegraph.com/api/[api-key]/subgraphs/id/[subgraph-id]';
    await scanner.connect(subgraphUrl);

    const expected = ['0x47283'];

    const pools = await scanner.scanPools();

    expect(pools).to.eql(expected);
  });
});
