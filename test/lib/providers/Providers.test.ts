/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {expect} from "chai";

import {ChainsIds} from "../../../src/types/ChainsIds";
import {ProviderFactory} from "../../../src/factories/ProviderFactory";
import {loadTestEnv} from "../../helpers/loadTestEnv";


describe.skip('Test Providers - debug integration tests', () => {
  before(() => {
    loadTestEnv();
  });

  [
    {chainId: ChainsIds.AVALANCHE, account: '0x4acd5cc057c1b8c771e2e3cd3e30780ca257dec0'},
    {chainId: ChainsIds.MULTIVERSX, account: 'erd1rf4hv70arudgzus0ymnnsnc4pml0jkywg2xjvzslg0mz4nn2tg7q7k0t6p'}
  ].forEach(({chainId, account}) => {

    describe(`[${chainId}] provider`, () => {
      const provider = ProviderFactory.create(chainId as ChainsIds);

      it("#getBlockNumber", async () => {
        const bn = await provider.getBlockNumber();
        console.log(`${chainId} block number: `, bn);
        expect(bn > 0n).true;
      }).timeout(5000);

      it("#getBlockTimestamp", async () => {
        const bn = await provider.getBlockTimestamp();
        console.log(`${chainId} block timestamp: `, bn);
        expect(bn > 0n).true;
      }).timeout(5000);

      it("#getNetwork", async () => {
        const {id, name} = await provider.getNetwork();
        console.log(`${chainId}: id: ${id}, name: ${name} `);
        expect(id).not.undefined;
        expect(name).not.undefined;
      }).timeout(5000);

      it("#getBalance", async () => {
        const balance = await provider.getBalance(account);
        console.log(`${chainId}: balance: ${balance} `);
        expect(balance > 0n).true;
      }).timeout(5000);
    });
  });
});
