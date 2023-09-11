import 'reflect-metadata';
import {expect} from 'chai';
import fs from 'fs';
import {ethers} from 'ethers';

import {UserSigner} from '@multiversx/sdk-wallet';
import {PayableOverrides} from '@ethersproject/contracts';

import {BlockchainRepository} from '../../src/repositories/BlockchainRepository';
import settings from '../../src/config/settings';
import {loadTestEnv} from '../helpers/loadTestEnv';
import {ChainsIds} from '../../src/types/ChainsIds';
import {UmbrellaFeedsContractFactory} from '../../src/factories/contracts/UmbrellaFeedsContractFactory';
import {UmbrellaFeedInterface} from '../../src/contracts/interfaces/UmbrellaFeedInterface';
import {PriceData, UmbrellaFeedsUpdateArgs} from '../../src/types/DeviationFeeds';
import {DeviationSignerMultiversX} from '../../src/services/deviationsFeeds/multiversX/DeviationSignerMultiversX';
import {DeviationHasher} from '../../src/services/deviationsFeeds/DeviationHasher';
import {ProviderFactory} from '../../src/factories/ProviderFactory';

describe.skip('Umbrella Feeds debug integration tests', () => {
  let blockchainRepo: BlockchainRepository;

  before(() => {
    loadTestEnv();
    blockchainRepo = new BlockchainRepository(settings);
  });

  [ChainsIds.AVALANCHE, ChainsIds.MULTIVERSX].forEach((chainId) => {
    describe(`[${chainId}] on-chain feeds tests`, () => {
      let umbrellaFeeds: UmbrellaFeedInterface;

      beforeEach(() => {
        umbrellaFeeds = UmbrellaFeedsContractFactory.create(blockchainRepo.get(chainId));
      });

      it('#address', async () => {
        const addr = await umbrellaFeeds.address();
        console.log(`${chainId} UmbrellaFeeds: `, addr);

        switch (chainId) {
          case ChainsIds.MULTIVERSX:
            expect(addr.length).eq(62);
            expect(addr.slice(0, 4)).eq('erd1');
            break;

          default:
            expect(addr.slice(0, 2)).eq('0x');
            expect(addr.length).eq(42);
        }
      }).timeout(5000);

      it('#requiredSignatures', async () => {
        expect(await umbrellaFeeds.requiredSignatures()).eq(2);
      });

      it('#getManyPriceDataRaw empty array', async () => {
        const priceDatas = await umbrellaFeeds.getManyPriceDataRaw([]);
        expect(priceDatas).not.undefined;
        expect(priceDatas?.length).eq(0);
      }).timeout(10000);

      it('#getManyPriceDataRaw with key', async () => {
        const priceDatas = await umbrellaFeeds.getManyPriceDataRaw(['a']);
        console.log(priceDatas);
      }).timeout(10000);

      describe('#hashData', async () => {
        const hasher = new DeviationHasher();
        let networkId: number;
        let target: string;

        beforeEach(async () => {
          [networkId, target] = await Promise.all([blockchainRepo.get(chainId).networkId(), umbrellaFeeds.address()]);
        });

        it('hash empty data', async () => {
          const [hash, contractHash] = await Promise.all([
            hasher.apply(chainId, networkId, target, [], []),
            umbrellaFeeds.hashData([], []),
          ]);

          expect(hash).eq(contractHash);
        });

        it('hash one PriceData', async () => {
          const priceDatas: PriceData[] = [
            {
              data: 0,
              heartbeat: 0,
              timestamp: 1688998115,
              price: 1000000000n,
            },
          ];

          const keys = ['ETH-USD'];

          const [hash, contractHash] = await Promise.all([
            hasher.apply(chainId, networkId, target, keys, priceDatas),
            umbrellaFeeds.hashData(
              keys.map((k) => ethers.utils.id(k)),
              priceDatas,
            ),
          ]);

          expect(hash).eq(contractHash);
        });

        it('hash many PriceDatas', async () => {
          const priceDatas: PriceData[] = [
            {
              data: 0,
              heartbeat: 0,
              timestamp: 1688998115,
              price: 1000000000n,
            },
            {
              data: 0,
              heartbeat: 2 ** 24 - 1,
              timestamp: 2 ** 32 - 1,
              price: 2n ** 128n - 1n,
            },
          ];

          const keys = ['ETH-USD', 'BTC-USD'];

          const [hash, contractHash] = await Promise.all([
            hasher.apply(chainId, networkId, target, keys, priceDatas),
            umbrellaFeeds.hashData(
              keys.map((k) => ethers.utils.id(k)),
              priceDatas,
            ),
          ]);

          expect(hash).eq(contractHash);
        }).timeout(10000);
      });
    });
  });

  describe(`[MultiversX] #update`, () => {
    let umbrellaFeeds: UmbrellaFeedInterface;

    beforeEach(() => {
      umbrellaFeeds = UmbrellaFeedsContractFactory.create(blockchainRepo.get(ChainsIds.MULTIVERSX));
    });

    it('#getManyPriceDataRaw', async () => {
      const data = await umbrellaFeeds.getManyPriceDataRaw(['ETH-USD', 'TEST'].map((k) => ethers.utils.id(k)));
      console.log(data);
    });

    it.skip('DEBUG: check tx hash', async () => {
      const provider = ProviderFactory.create(ChainsIds.MULTIVERSX);
      expect(await provider.waitForTx('e00ece29f3b90c12d9aacde215bf4e0aa5f32cc8bd9ecaaaba3a192c5f1fb1c2', 10000)).true;
    });

    it.skip('DEBUG: base update', async () => {
      const provider = ProviderFactory.create(ChainsIds.MULTIVERSX);
      const umbrellaFeed = UmbrellaFeedsContractFactory.create(blockchainRepo.get(ChainsIds.BASE));

      const data = {
        keys: ['UMB-USD'].map(ethers.utils.id),
        signatures: [
          '0xb8eaf93106c698fee6c1e8b2776fa33521005bc866b9168335eb81d7516d69dd02ee4ac83262f6819d3cc6ded97a648695d357057c00fdcd28a7c38ce711975c1b',
          '0xd0233bdc936a7ac2b68b056e29722e515f28d2d0b96168996406dd4fcb311bd858c16b548ae427334b0918615bbf5dbad8461bbca30df125466eaaa68a8ece4a1b',
        ],
        priceDatas: [
          {
            data: 0,
            price: 753163n,
            timestamp: 1694037660,
            heartbeat: 21600,
          },
        ],
      } as UmbrellaFeedsUpdateArgs;

      const tx = await umbrellaFeed.update(data, {});
      expect(await provider.waitForTx(tx.hash, 10000)).true;
    });

    it.skip('sign, update', async () => {
      const priceDatas: PriceData[] = [
        {
          data: 0,
          heartbeat: 60 * 60 * 24 * 30,
          timestamp: Math.trunc(Date.now() / 1000),
          price: 9_99999999n,
        },
        {
          data: 0,
          heartbeat: 100,
          timestamp: Math.trunc(Date.now() / 1000),
          price: 1n,
        },
      ];

      const keys = ['GOOD-PRICE', 'BAD-PRICE'];
      const networkId = 0;
      const umbrellaFeeds = UmbrellaFeedsContractFactory.create(blockchainRepo.get(ChainsIds.MULTIVERSX));
      const target = await umbrellaFeeds.address();

      const hasher = new DeviationHasher();

      const hash = hasher.apply(ChainsIds.MULTIVERSX, networkId, target, keys, priceDatas);

      const privateKeyPem1 = fs.readFileSync(__dirname + '/../pem/validator.dev.pem').toString();
      const privateKeyPem2 = fs.readFileSync(__dirname + '/../pem/validator2.dev.pem').toString();
      // const privateKey = UserSecretKey.fromPem(file);
      const user1 = UserSigner.fromPem(privateKeyPem1);
      const user2 = UserSigner.fromPem(privateKeyPem2);

      const signatures = await Promise.all([
        DeviationSignerMultiversX.apply(user1, hash),
        DeviationSignerMultiversX.apply(user2, hash),
      ]);

      const args: UmbrellaFeedsUpdateArgs = {
        keys: keys.map((k) => ethers.utils.id(k)),
        priceDatas,
        signatures,
      };

      const payableOverrides: PayableOverrides = {};
      const executed = await umbrellaFeeds.update(args, payableOverrides);

      console.log(executed);

      const success = await blockchainRepo.get(ChainsIds.MULTIVERSX).provider.waitForTx(executed.hash, 45000);
      console.log('success:', success);

      console.log(await umbrellaFeeds.getManyPriceDataRaw(args.keys));
    }).timeout(60000);
  });
});
