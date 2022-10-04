import {expect} from 'chai';
import {Keypair} from '@solana/web3.js';
import {derivePDAFromBlockId, getKeyPairFromSecretKeyString} from '../../src/utils/solana';

describe('Solana', async () => {
  const programId = Keypair.generate().publicKey;
  const testCases = [
    {blockId: 123456},
    {blockId: 1234567},
    {blockId: 12345678},
    {blockId: 123456789},
    {blockId: 1234567890},
  ];

  describe('#derivePDAFromBlockId', async () => {
    describe('When a valid blockId and publicKey are given', async () => {
      testCases.forEach(({blockId}) => {
        it(`should return a block public key for blockId ${blockId} and programId ${programId}`, async () => {
          const [blockPublicKey] = await derivePDAFromBlockId(blockId, programId);
          expect(!!blockPublicKey).to.eql(true);
          expect(typeof blockPublicKey.toBase58()).to.eql('string');
        });
      });

      it('all public keys should be unique', async () => {
        const keys: string[] = [];
        for (const {blockId} of testCases) {
          const [blockPublicKey] = await derivePDAFromBlockId(blockId, programId);
          keys.push(blockPublicKey.toBase58());
        }

        expect(new Set(keys).size === keys.length).to.eql(true);
      });
    });

    describe('When the same blockId is used with 2 different programIds', async () => {
      it('the block public keys should be unique', async () => {
        const blockId = 123456;
        const programId0 = Keypair.generate().publicKey;
        const programId1 = Keypair.generate().publicKey;
        const [blockPublicKey0] = await derivePDAFromBlockId(blockId, programId0);
        const [blockPublicKey1] = await derivePDAFromBlockId(blockId, programId1);
        expect(blockPublicKey0.toBase58()).to.not.eql(blockPublicKey1.toBase58());
      });
    });

    describe('When the same elements are present in the seeds Buffer array', async () => {
      const similarTestCases = [
        {blockId: 123456},
        {blockId: 125634},
        {blockId: 341256},
        {blockId: 345612},
        {blockId: 561234},
        {blockId: 563412},
      ];

      it('the public keys should be unique', async () => {
        const keys: string[] = [];
        for (const {blockId} of similarTestCases) {
          const [blockPublicKey] = await derivePDAFromBlockId(blockId, programId);
          keys.push(blockPublicKey.toBase58());
        }

        expect(new Set(keys).size === keys.length).to.eql(true);
      });
    });
  });

  describe('#getKeyPairFromSecretKeyString', () => {
    describe('When a valid secret key string is given', () => {
      it('should return the correct Keypair', async () => {
        const keypair = Keypair.generate();
        const replicaKeypair = getKeyPairFromSecretKeyString('[' + keypair.secretKey.toString() + ']');
        expect(keypair.publicKey.toBase58()).to.eql(replicaKeypair.publicKey.toBase58());
      });
    });
  });
});
