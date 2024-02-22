/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import chai from 'chai';

import {ChainsIds} from '../../src/types/ChainsIds.js';
import {ProviderFactory} from '../../src/factories/ProviderFactory.js';
import {loadTestEnv} from '../helpers/loadTestEnv.js';
import {generateChainId} from '../../src/blockchains/generateChainId.js';
import {ProviderInterface} from '../../src/interfaces/ProviderInterface.js';

const {expect} = chai;

describe.skip('Test Providers - debug integration tests', () => {
  before(() => {
    loadTestEnv();
  });

  [
    // {chainId: ChainsIds.AVALANCHE, account: '0x4acd5cc057c1b8c771e2e3cd3e30780ca257dec0'},
    {chainId: ChainsIds.MULTIVERSX, account: 'erd1ydry2dkxlmghe7fvyj0u9tne40zmrm8rngk6hdcukkcjusxrpvuq9mq2l6'},
    // {chainId: ChainsIds.MASSA, account: 'AU1h7jfDGJYHxFYDoG2disme925yopJ359yyYvwjkxPqwKDn1cGa'},
    // {chainId: ChainsIds.CONCORDIUM, account: '41EpZoem2w2UpEYiLihvKEkbUCuuGD8DC7ajqNL6zJnDYeHQkw'},
  ].forEach(({chainId, account}) => {
    describe(`[${chainId}] provider`, () => {
      let provider: ProviderInterface;

      beforeEach(() => {
        provider = ProviderFactory.create(chainId as ChainsIds);
      });

      it(`[${chainId}] #getBlockNumber`, async () => {
        const bn = await provider.getBlockNumber();
        console.log(`${chainId} block number: `, bn);
        expect(bn > 0n).true;
      }).timeout(5000);

      it(`[${chainId}] #getBlockTimestamp`, async () => {
        const bn = await provider.getBlockTimestamp();
        console.log(`${chainId} block timestamp: `, bn);
        expect(bn > 0n).true;
      }).timeout(5000);

      it(`[${chainId}] #getNetwork`, async () => {
        const {id, name} = await provider.getNetwork();
        console.log(`${chainId}: id: ${id}, name: ${name} `);
        expect(id).not.undefined;
        expect(name).not.undefined;

        expect(id).eq(generateChainId(chainId));
      }).timeout(5000);

      it(`[${chainId}] #getBalance`, async () => {
        const balance = await provider.getBalance(account);
        console.log(`${chainId}: balance: ${balance} `);
        expect(balance > 0n).true;
      }).timeout(5000);
    });
  });
});
