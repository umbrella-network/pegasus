import 'reflect-metadata';
import chai from 'chai';
import {ethers} from 'ethers';

import {BlockchainRepository} from '../../../src/repositories/BlockchainRepository.js';
import settings from '../../../src/config/settings.js';
import {loadTestEnv} from '../../helpers/loadTestEnv.js';
import {ChainsIds} from '../../../src/types/ChainsIds.js';
import {UmbrellaFeedsContractFactory} from '../../../src/factories/contracts/UmbrellaFeedsContractFactory.js';
import {UmbrellaFeedInterface} from '../../../src/interfaces/UmbrellaFeedInterface.js';
import {PriceData} from '../../../src/types/DeviationFeeds.js';
import {DeviationHasher} from '../../../src/services/deviationsFeeds/DeviationHasher.js';
import {DeviationSignerRepository} from '../../../src/repositories/DeviationSignerRepository.js';
import {mockedLogger} from '../../mocks/logger.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';
import {DeviationSignerInterface} from '../../../src/services/deviationsFeeds/interfaces/DeviationSignerInterface';

const {expect} = chai;

describe.skip('Umbrella Feeds debug integration tests', () => {
  let blockchainRepo: BlockchainRepository;
  let deviationSignerRepository: DeviationSignerRepository;

  before(() => {
    loadTestEnv();

    const container = getTestContainer();
    container.rebind('Logger').toConstantValue(mockedLogger);
    blockchainRepo = new BlockchainRepository(settings, mockedLogger);

    container.bind(DeviationSignerRepository).toSelf();

    deviationSignerRepository = container.get(DeviationSignerRepository);
  });

  [
    // ChainsIds.AVALANCHE,
    ChainsIds.MULTIVERSX,
  ].forEach((chainId) => {
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

          case ChainsIds.MASSA:
            // expect(Utilities.isAddressEoa(addr)).false;
            expect(addr.slice(0, 4)).eq('AS');
            break;

          default:
            expect(addr.slice(0, 2)).eq('0x');
            expect(addr.length).eq(42);
        }
      }).timeout(5000);

      it('#requiredSignatures', async () => {
        expect(await umbrellaFeeds.requiredSignatures()).eq(2);
      });

      it.skip('#getManyPriceDataRaw empty array', async () => {
        const priceDatas = await umbrellaFeeds.getManyPriceDataRaw([]);
        expect(priceDatas).not.undefined;
        expect(priceDatas?.length).eq(0);
      }).timeout(10000);

      it('#getManyPriceDataRaw with non exist key', async () => {
        const priceDatas = await umbrellaFeeds.getManyPriceDataRaw(['a']);
        console.log(priceDatas);
        if (!priceDatas) throw Error('undefined priceDatas');

        const priceData = priceDatas[0];

        expect(priceDatas.length).eq(0);

        expect(priceData.data).eq(0, 'data');
        expect(priceData.timestamp).eq(0, 'timestamp');
        expect(priceData.heartbeat).eq(0, 'heartbeat');
        expect(priceData.price).eq(0n, 'price');
      }).timeout(10000);

      describe('#hashData', async () => {
        const hasher = new DeviationHasher();
        let networkId: number;
        let target: string;

        beforeEach(async () => {
          [networkId, target] = await Promise.all([blockchainRepo.get(chainId).networkId(), umbrellaFeeds.address()]);
        });

        it('hash empty data', async () => {
          const hash = await hasher.apply(chainId, networkId, target, [], []);
          const contractHash = await umbrellaFeeds.hashData([], []);

          expect(hash).eq(contractHash);
        });

        it('hash one PriceData', async () => {
          const priceDatas: PriceData[] = [
            {
              data: 8,
              heartbeat: 1,
              timestamp: 2,
              price: 1821n,
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

          const keys = ['BTC-USD', 'ETH-USD'];

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

      describe('#signData', async () => {
        const hasher = new DeviationHasher();
        let signer: DeviationSignerInterface;
        let networkId: number;
        let target: string;

        beforeEach(async () => {
          [networkId, target] = await Promise.all([blockchainRepo.get(chainId).networkId(), umbrellaFeeds.address()]);
          signer = deviationSignerRepository.get(chainId);
        });

        it.skip('sign one PriceData', async () => {
          const priceDatas: PriceData[] = [
            {
              data: 0,
              heartbeat: 0,
              timestamp: 1688998115,
              price: 1000000000n,
            },
          ];

          const keys = ['ETH-USD'];

          const hash = hasher.apply(chainId, networkId, target, keys, priceDatas);
          const signature = await signer.apply(hash);

          console.log({signature});

          expect(signature).not.empty;
        });
      });
    });
  });
});
