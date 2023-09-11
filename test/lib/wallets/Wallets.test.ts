/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import {expect} from "chai";

import {ChainsIds} from "../../../src/types/ChainsIds";
import {loadTestEnv} from "../../helpers/loadTestEnv";
import {WalletFactory} from "../../../src/factories/WalletFactory";


describe('Test Wallets', () => {
  before(() => {
    loadTestEnv();
  });

  [ChainsIds.AVALANCHE, ChainsIds.MULTIVERSX].forEach((chainId) => {
    describe(`[${chainId}] provider`, () => {
      const wallet = WalletFactory.create(chainId as ChainsIds);

      it("#address", async () => {
        console.log(`${chainId}: address: ${wallet.address} `);
        expect(wallet.address).not.empty;
      });

      it("#getBalance", async () => {
        const balance = await wallet.getBalance();
        console.log(`${chainId}: balance: ${balance} `);
        expect(balance > 0n).true;
      }).timeout(5000);

      it("#getNextNonce", async () => {
        const nonce = await wallet.getNextNonce();
        console.log(`${chainId}: getNextNonce: ${nonce} `);
        expect(nonce).gt(0);
      }).timeout(5000);
    });
  });
});
