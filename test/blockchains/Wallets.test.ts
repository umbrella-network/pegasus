/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import chai from 'chai';

import {ChainsIds} from '../../src/types/ChainsIds.js';
import {loadTestEnv} from '../helpers/loadTestEnv.js';
import {DeviationWalletFactory} from '../../src/factories/DeviationWalletFactory.js';
import {IWallet} from '../../src/interfaces/IWallet.js';

const {expect} = chai;

describe.skip('Test Wallets', () => {
  before(() => {
    loadTestEnv();
  });

  [
    // ChainsIds.MASSA,
    ChainsIds.CONCORDIUM,
  ].forEach((chainId) => {
    describe(`[${chainId}] provider`, () => {
      let wallet: IWallet;

      before(async () => {
        const w = DeviationWalletFactory.create(chainId as ChainsIds);
        if (!w) throw new Error(`no DeviationWallet for ${chainId}`);

        wallet = w;
      });

      it('#address', async () => {
        console.log(`${chainId}: address: ${wallet.address} `);
        expect(wallet.address).not.empty;
      });

      it('#getBalance', async () => {
        const balance = await wallet.getBalance();
        console.log(`${chainId}: balance: ${balance} `);
        expect(balance > 0n).true;
      }).timeout(5000);

      it('#getNextNonce', async () => {
        const nonce = await wallet.getNextNonce();
        console.log(`${chainId}: getNextNonce: ${nonce} `);
        expect(nonce > 0).true;
      }).timeout(5000);
    });
  });
});
