import 'reflect-metadata';
import chai from 'chai';
import {ethers} from 'ethers';
import {Logger} from 'winston';

import {PayableOverrides} from '@ethersproject/contracts';

import {BlockchainRepository} from '../../src/repositories/BlockchainRepository.js';
import settings from '../../src/config/settings.js';
import {loadTestEnv} from '../helpers/loadTestEnv.js';
import {ChainsIds} from '../../src/types/ChainsIds.js';
import {UmbrellaFeedsContractFactory} from '../../src/factories/contracts/UmbrellaFeedsContractFactory.js';
import {UmbrellaFeedInterface} from '../../src/interfaces/UmbrellaFeedInterface.js';
import {PriceData, UmbrellaFeedsUpdateArgs} from '../../src/types/DeviationFeeds.js';
import {DeviationHasher} from '../../src/services/deviationsFeeds/DeviationHasher.js';
import {ProviderFactory} from '../../src/factories/ProviderFactory.js';
import {DeviationSignerRepository} from '../../src/repositories/DeviationSignerRepository.js';
import {getTestContainer} from '../helpers/getTestContainer.js';
import {FeedName} from '../../src/types/Feed';
import {StakingBankContractFactory} from '../../src/factories/contracts/StakingBankContractFactory.js';
import {StakingBankInterface} from '../../src/interfaces/StakingBankInterface.js';
// import {UmbrellaFeedsConcordium} from '../../src/blockchains/concordium/contracts/UmbrellaFeedsConcordium';

const {expect} = chai;

describe.skip('final integration tests', () => {
  let blockchainRepo: BlockchainRepository;
  let logger: Logger;

  before(() => {
    loadTestEnv();

    const container = getTestContainer();

    container.bind(BlockchainRepository).toSelf();
    container.bind(DeviationSignerRepository).toSelf();

    blockchainRepo = container.get(BlockchainRepository);
    logger = container.get('Logger');
  });

  describe('[INTEGRATION] #update', () => {
    const chainId = ChainsIds.MULTIVERSX;
    let umbrellaFeeds: UmbrellaFeedInterface;
    let bank: StakingBankInterface;

    beforeEach(() => {
      umbrellaFeeds = UmbrellaFeedsContractFactory.create(blockchainRepo.get(chainId));
      bank = StakingBankContractFactory.create(blockchainRepo.get(chainId));
    });

    it(`[${chainId}] #getManyPriceDataRaw`, async () => {
      const data = await umbrellaFeeds.getManyPriceDataRaw(['ETH-USD', 'TEST']);
      console.log(data);
    });

    it(`[${chainId}] DEBUG: check tx hash`, async () => {
      const provider = ProviderFactory.create(chainId);
      expect(await provider.waitForTx('e00ece29f3b90c12d9aacde215bf4e0aa5f32cc8bd9ecaaaba3a192c5f1fb1c2', 10000)).true;
    });

    it(`[${chainId}] DEBUG: base update`, async () => {
      const provider = ProviderFactory.create(chainId);
      const umbrellaFeed = UmbrellaFeedsContractFactory.create(blockchainRepo.get(ChainsIds.BASE));

      const data = {
        keys: ['UMB-USD'].map(ethers.utils.id),
        signatures: [
          '0xb8eaf93106c698fee6c1e8b2776fa33521005bc866b9168335eb81d7516d69dd02ee4ac83262f6819d3cc6ded97' +
            'a648695d357057c00fdcd28a7c38ce711975c1b',
          '0xd0233bdc936a7ac2b68b056e29722e515f28d2d0b96168996406dd4fcb311bd858c16b548ae427334b0918615bb' +
            'f5dbad8461bbca30df125466eaaa68a8ece4a1b',
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

    it.skip(`[${chainId}] sign, update`, async () => {
      const network = await ProviderFactory.create(chainId).getNetwork();

      const priceDatas: PriceData[] = [
        {
          data: 0,
          heartbeat: 1,
          timestamp: 1702896406,
          price: 16535n,
        },
        {
          data: 0,
          heartbeat: 1,
          timestamp: 1702896406,
          price: 1821n,
        },
      ];

      const feedsNames: FeedName[] = ['GOOD-PRICE', 'BAD-PRICE'];

      const umbrellaFeeds = UmbrellaFeedsContractFactory.create(blockchainRepo.get(chainId));
      // await (umbrellaFeeds as UmbrellaFeedsConcordium).contractSetup();
      console.log('umbrellaFeeds', await umbrellaFeeds.address());
      console.log('bank', await bank.address());
      const target = await umbrellaFeeds.address();

      const hasher = new DeviationHasher();

      const hash = hasher.apply(chainId, network.id, target, feedsNames, priceDatas);

      const [hasOnChain, validators] = await Promise.all([
        umbrellaFeeds.hashData(feedsNames, priceDatas),
        bank.resolveValidators(),
      ]);

      expect(hash).eq(hasOnChain, 'hash is wrong');
      console.log('HASH OK!');

      const privateKey1 = process.env.TEST_SIGNING_PRIVATE_KEY1 || '';
      const privateKey2 = process.env.TEST_SIGNING_PRIVATE_KEY2 || '';

      console.log('umbrellaFeeds address', await umbrellaFeeds.address());
      console.log('BEFORE UPDATE:', await umbrellaFeeds.getManyPriceDataRaw(feedsNames));

      settings.blockchain.wallets.multiversX.privateKey = privateKey1;
      const signerRepo1 = new DeviationSignerRepository(settings, logger);
      const signer1 = signerRepo1.get(chainId);
      const signer1Addr = await signer1.address();
      console.log({signer1Addr});
      console.log(ethers.utils.arrayify(Buffer.from(signer1Addr, 'hex')));
      expect(signer1Addr).eq(validators[0].id, 'invalid validator1');
      console.log(`signer1 ${signer1Addr} OK`);

      settings.blockchain.wallets.multiversX.privateKey = privateKey2;
      const signerRepo2 = new DeviationSignerRepository(settings, logger);
      const signer2 = signerRepo2.get(chainId);
      const signer2Addr = await signer2.address();
      console.log({signer2Addr});
      console.log(ethers.utils.arrayify(Buffer.from(signer2Addr, 'hex')));
      expect(signer2Addr).eq(validators[1].id, 'invalid validator2');
      console.log(`signer2 ${signer2Addr} OK`);

      const signatures = await Promise.all([await signer1.apply(hash), signer2.apply(hash)]);

      const args: UmbrellaFeedsUpdateArgs = {
        keys: feedsNames,
        priceDatas,
        signatures,
      };

      console.log({args});

      const payableOverrides: PayableOverrides = {};
      const executed = await umbrellaFeeds.update(args, payableOverrides);

      console.log({executed});

      const success = await blockchainRepo.get(chainId).provider.waitForTx(executed.hash, 65000);
      console.log('success:', success);

      console.log(await umbrellaFeeds.getManyPriceDataRaw(feedsNames));
      expect(success).true;
    }).timeout(65000);
  });
});
