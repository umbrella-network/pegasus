import 'reflect-metadata';
import chai from 'chai';

import {BlockchainRepository} from '../../../src/repositories/BlockchainRepository.js';
import {loadTestEnv} from '../../helpers/loadTestEnv.js';
import {ChainsIds} from '../../../src/types/ChainsIds.js';
import {UmbrellaFeedsContractFactory} from '../../../src/factories/contracts/UmbrellaFeedsContractFactory.js';
import {UmbrellaFeedInterface} from '../../../src/interfaces/UmbrellaFeedInterface.js';
import {PriceData} from '../../../src/types/DeviationFeeds.js';
import {DeviationHasher} from '../../../src/services/deviationsFeeds/DeviationHasher.js';
import {DeviationSignerRepository} from '../../../src/repositories/DeviationSignerRepository.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';
import {DeviationSignerInterface} from '../../../src/services/deviationsFeeds/interfaces/DeviationSignerInterface.js';
import {StakingBankContractFactory} from '../../../src/factories/contracts/StakingBankContractFactory.js';

const {expect} = chai;

describe.skip('Umbrella Feeds debug integration tests', () => {
  let blockchainRepo: BlockchainRepository;
  let deviationSignerRepository: DeviationSignerRepository;

  before(() => {
    loadTestEnv();

    const container = getTestContainer();
    container.bind(BlockchainRepository).toSelf();
    container.bind(DeviationSignerRepository).toSelf();

    blockchainRepo = container.get(BlockchainRepository);
    deviationSignerRepository = container.get(DeviationSignerRepository);
  });

  [
    // ChainsIds.AVALANCHE,
    // ChainsIds.MULTIVERSX,
    ChainsIds.MASSA,
    // ChainsIds.LINEA,
    // ChainsIds.CONCORDIUM,
  ].forEach((chainId) => {
    describe(`[${chainId}] on-chain feeds tests`, () => {
      let umbrellaFeeds: UmbrellaFeedInterface;

      beforeEach(() => {
        const blockchain = blockchainRepo.get(chainId);
        umbrellaFeeds = UmbrellaFeedsContractFactory.create(blockchain);
      });

      it(`[${chainId}] #address`, async () => {
        const addr = await umbrellaFeeds.address();
        console.log(`${chainId} UmbrellaFeeds: `, addr);

        switch (chainId) {
          case ChainsIds.MULTIVERSX:
            expect(addr.length).eq(62);
            expect(addr.slice(0, 4)).eq('erd1');
            break;

          case ChainsIds.MASSA:
            // expect(Utilities.isAddressEoa(addr)).false;
            expect(addr.slice(0, 3)).eq('AS1');
            break;

          case ChainsIds.CONCORDIUM:
            // expect(Utilities.isAddressEoa(addr)).false;
            expect(addr.split(',').length).eq(2);
            break;

          default:
            expect(addr.slice(0, 2)).eq('0x');
            expect(addr.length).eq(42);
        }
      }).timeout(5000);

      it.skip(`[${chainId}] #requiredSignatures`, async () => {
        expect(await umbrellaFeeds.requiredSignatures()).eq(6);
      });

      it(`[${chainId}] #getManyPriceDataRaw empty array`, async () => {
        const priceDatas = await umbrellaFeeds.getManyPriceDataRaw([]);
        expect(priceDatas).not.undefined;
        expect(priceDatas?.length).eq(0);
      }).timeout(10000);

      it(`[${chainId}] #getManyPriceDataRaw with non exist key`, async () => {
        const priceDatas = await umbrellaFeeds.getManyPriceDataRaw(['abcdefghij']);
        console.log(priceDatas);
        if (!priceDatas) throw Error('undefined priceDatas');

        const priceData = priceDatas[0];

        expect(priceDatas.length).eq(1);

        expect(priceData.data).eq(0, 'data');
        expect(priceData.timestamp).eq(0, 'timestamp');
        expect(priceData.heartbeat).eq(0, 'heartbeat');
        expect(priceData.price).eq(0n, 'price');
      }).timeout(10000);

      it(`[${chainId}] #getManyPriceDataRaw with existing keys`, async () => {
        const priceDatas = await umbrellaFeeds.getManyPriceDataRaw(['UMB-USD', 'EGLD-USD']);
        console.log({priceDatas});
        if (!priceDatas) throw Error('undefined priceDatas');

        const priceData = priceDatas[0];

        expect(priceDatas.length).eq(2);

        expect(priceData.data).eq(0, 'data');
        expect(priceData.timestamp).gt(0, 'timestamp');
        expect(priceData.heartbeat).gt(0, 'heartbeat');
        expect(priceData.price > 0n, 'price');
      }).timeout(10000);

      describe('#hashData', async () => {
        const hasher = new DeviationHasher();
        let networkId: number;
        let target: string;

        beforeEach(async () => {
          [networkId, target] = await Promise.all([blockchainRepo.get(chainId).networkId(), umbrellaFeeds.address()]);
        });

        it(`[${chainId}] hash empty data`, async () => {
          const hash = hasher.apply(chainId, networkId, target, [], []);
          const contractHash = await umbrellaFeeds.hashData([], []);

          console.log({chainId, networkId, hash, contractHash});

          expect(hash).eq(contractHash);
        });

        it(`[${chainId}] hash one PriceData`, async () => {
          const priceDatas: PriceData[] = [
            {
              data: 8,
              heartbeat: 1,
              timestamp: 2,
              price: 1821n,
            },
          ];

          const names = ['ETH-USD'];

          const [hash, contractHash] = await Promise.all([
            hasher.apply(chainId, networkId, target, names, priceDatas),
            umbrellaFeeds.hashData(names, priceDatas),
          ]);

          console.log({chainId, networkId, hash, contractHash});

          expect(hash).eq(contractHash);
        });

        it(`[${chainId}] hash many PriceDatas`, async () => {
          const priceDatas: PriceData[] = [
            {
              data: 9,
              heartbeat: 1,
              timestamp: 2,
              price: 16535n,
            },
            {
              data: 8,
              heartbeat: 1,
              timestamp: 2,
              price: 1821n,
            },
          ];

          const names = ['BTC-USD', 'ETH-USD'];

          const [hash, contractHash] = await Promise.all([
            hasher.apply(chainId, networkId, target, names, priceDatas),
            umbrellaFeeds.hashData(names, priceDatas),
          ]);

          console.log({hash, contractHash});

          expect(hash).eq(contractHash);
        }).timeout(10000);
      });

      describe.skip('#signData', async () => {
        const hasher = new DeviationHasher();
        let signer: DeviationSignerInterface;
        let networkId: number;
        let target: string;

        beforeEach(async () => {
          [networkId, target] = await Promise.all([blockchainRepo.get(chainId).networkId(), umbrellaFeeds.address()]);
          signer = deviationSignerRepository.get(chainId);

          if (!signer) throw new Error(`empty signer for ${chainId}`);
        });

        it(`[${chainId}] ensure signer is registered in bank`, async () => {
          const bank = StakingBankContractFactory.create(blockchainRepo.get(chainId));
          const blockchain = blockchainRepo.get(chainId);

          const validatorAddress = await signer.address();
          console.log({validatorAddress});

          let balance: bigint;

          try {
            balance = await bank.balanceOf(validatorAddress);
          } catch (e) {
            balance = -1n;
          }

          const deviationAddress = await blockchain.deviationWallet?.address();

          console.log({balance, deviationAddress});

          expect(!!deviationAddress).eq(true, 'setup deviation wallet');

          console.log('validators:', [validatorAddress, deviationAddress || '']);

          if (balance < 0n) {
            console.log('!!! BALANCE OF MISSING !!!');
          } else {
            expect(Number(balance)).gt(0, 'balanceOf check - validator not registered');
          }

          expect(await bank.verifyValidators([validatorAddress])).eq(true, 'verifyValidators check');
        });

        it(`[${chainId}] sign one PriceData`, async () => {
          const priceDatas: PriceData[] = [
            {
              data: 0,
              heartbeat: 0,
              timestamp: 1688998115,
              price: 1000000000n,
            },
          ];

          const name = ['ETH-USD'];

          const hash = hasher.apply(chainId, networkId, target, name, priceDatas);
          const signature = await signer.apply(hash);

          console.log({signature: JSON.stringify(signature)});

          expect(signature).not.empty;
        }).timeout(10000);
      });
    });
  });
});
