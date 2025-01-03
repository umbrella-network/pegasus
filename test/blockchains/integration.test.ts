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

const {expect} = chai;

describe.only('final integration tests', () => {
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
    const chainId = ChainsIds.MASSA;
    let umbrellaFeeds: UmbrellaFeedInterface;
    let bank: StakingBankInterface;

    beforeEach(() => {
      umbrellaFeeds = UmbrellaFeedsContractFactory.create(blockchainRepo.get(chainId));
      bank = StakingBankContractFactory.create(blockchainRepo.get(chainId));
    });

    it(`[${chainId}] #getManyPriceDataRaw`, async () => {
      const data = await umbrellaFeeds.getManyPriceDataRaw(['ETH-USD', 'TEST']);
      console.log(data);
    }).timeout(10000);

    it(`[${chainId}] DEBUG: check tx hash`, async () => {
      const provider = ProviderFactory.create(chainId);
      const success = await provider.waitForTx('O12g5zV8tgWDbdjZFVAzTU83somaL9AEm1cF2byC8AscGcNkeeKJ', 15000);
      expect(success).true;
    }).timeout(20000);

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

      console.log({chainId, id: network.id, target, feedsNames, priceDatas});

      const [hasOnChain, validators] = await Promise.all([
        umbrellaFeeds.hashData(feedsNames, priceDatas),
        bank.resolveValidators(),
      ]);

      expect(hash).eq(hasOnChain, 'hash is wrong');
      console.log('HASH OK!', hash);

      const privateKey1 = process.env.TEST_SIGNING_PRIVATE_KEY1 || '';
      const privateKey2 = process.env.TEST_SIGNING_PRIVATE_KEY2 || '';

      console.log('BEFORE UPDATE:', await umbrellaFeeds.getManyPriceDataRaw(feedsNames));

      settings.blockchain.wallets[chainId].privateKey = privateKey1;
      const signerRepo1 = new DeviationSignerRepository(settings, logger);
      const signer1 = signerRepo1.get(chainId);
      const signer1Addr = await signer1.address();
      console.log({signer1Addr});
      console.log(ethers.utils.arrayify(Buffer.from(signer1Addr, 'hex')));
      expect(signer1Addr).eq(validators[0].id, 'invalid validator1');
      console.log(`signer1 ${signer1Addr} OK`);

      settings.blockchain.wallets[chainId].privateKey = privateKey2;
      const signerRepo2 = new DeviationSignerRepository(settings, logger);
      const signer2 = signerRepo2.get(chainId);
      const signer2Addr = await signer2.address();
      console.log({signer2Addr});
      console.log(ethers.utils.arrayify(Buffer.from(signer2Addr, 'hex')));
      expect(signer2Addr).eq(validators[1].id, 'invalid validator2');
      console.log(`signer2 ${signer2Addr} OK`);

      const signaturesSettled = await Promise.allSettled([signer1.apply(hash), signer2.apply(hash)]);

      const signatures = signaturesSettled
        .map((s, i) => {
          if (s.status == 'fulfilled') return s.value;
          logger.error(`${i} ERROR ${s.reason}`);
          return '';
        })
        .filter((s) => !!s);

      console.log({signatures});

      expect(signatures.length).eq(2, 'missing some signatures');

      const args: UmbrellaFeedsUpdateArgs = {
        keys: feedsNames,
        priceDatas,
        signatures,
      };

      console.log('tx data', {args});
      console.log(JSON.stringify(args));

      const payableOverrides: PayableOverrides = {};
      const executed = await umbrellaFeeds.update(args, payableOverrides);

      console.log({executed});

      const success = await blockchainRepo.get(chainId).provider.waitForTx(executed.hash, 65000);
      console.log('success:', success);

      console.log(await umbrellaFeeds.getManyPriceDataRaw(feedsNames));
      expect(success).true;
    }).timeout(85000);

    it.only(`[${chainId}] just update`, async () => {
      const args: UmbrellaFeedsUpdateArgs = {
        keys: ['ETH-USD', 'BTC-USD'],
        priceDatas: [
          {data: 0, price: 345187000000n, timestamp: 1735903442, heartbeat: 86400},
          {data: 0, price: 9661086000000n, timestamp: 1735903442, heartbeat: 86400},
        ],
        signatures: [
          'P1APYAhYh65R7tGxAsPCi2a3YwWdft8jVrmSSn7BZej3tmxRhPf@1TkiC1aai8KHB5RDnLehwvBrWmZHXz6GRvJVzbYppmzafbCZSTxPmZ6pJzBmyy4xA1j3cUFnYJyCKiGN19gzFLseRSQNpg',
          'P1ApngdeUh6mVFmraDuajEX7k47yGftDGCQvY8eY4BritMwjwcF@1BKh8V7Uy75iZb1aP7YEUGy786AhXCZKSjfqGzSq65ftj12X3UqxSuV3DYpkr7ZxVvsFXHTHGHU4vVfDxQgnm5bnfZNgqX',
          'P1FW2ey9wCEhgmtHV1QGqbrcivXawYv1mY75tRZJao8d4gfzgMm@1UqHBFpbPVGn7xmRquznfNXUpBvoC6bse2dwphysj6QjYbSrLNbXFwdg9JNn1xmFhuLW5ow5PsZkbzaWDwnWkhjdCvQUZE',
          'P1QV6AsrtPdZqk9BVyMMfFCDgYEaMaSBatnCk8xs1jJzcMGNeFa@1LmQvhmNE3r1Jdq4LTv35xxyxSLSPd6oZESQygeP3eYJ5KbGYrGkHGaZDC3npd1NtobbZtKa2cMygpZMdBJwnFK3wgxoae',
          'P1UVGmWSxGxxJqkvauTHuidv2dP9PsdhBEk2vTSXTw59U2ycbQc@1N4uSdLaTb7tuKVCLKyhiTHXUXJYE7icFKqpXYKL4qDJPeLjESR9jqTPdihL3Fp4cR2SHS35rgnkJN9YrpQuC87wew3zKA',
          'P1cciVGrADZH1gPnNy1sXu2Q2Gmh4eLrdy5XPhFm7yXhbaigNeT@1BY9G6zSzcRF97k1StW56N6Psp1veArxTmtGxiVas93FfEJUxAtirKhsTf3BhiVfBj5igVyzVBhoN3hdgRxPK5jXscfvXN',
          'P1gN7svCytzkDegn3BAnHdtaT1nQux7krzFbj3KiweHgJFnJPpy@1ZDb45rnrEefeXciL1Jd3knLw5tYHiwpY1vCLicFtPiuRiWVxhz23r3WTnQMGhc1Xk388qvbvFaztm4REpTAayW7Ws2mhV',
          'P1241HUkWn3JiFR1DaFAeHs45W28cGyuXo7UuZW7YD8HTqJBYjuL@1Sx8TSxeU1LZ2vVk7kgXYt3mjrjR2pbsA62Q63DQmjhwndiCHsGJbWwiyhvojWPJfqwU7W7wMBCuk1dmjqZdHXaK2X9vBs',
          'P129pqQxdWEzyVhvp8jtxkdx62jV2RASdNDAHepMZuUnFHekMnBv@1NN4rBuGXQ3faXe9czjckhnFtbefqUBVX75fqVgwKn6Bpe117nHvRHP9c4TsohiWvr4UvWhnKbr3eXgKGSjRV5eWKR6FTQ',
          'P12DjfaK36WN5dVQXKmrjT1MszosKVNViXMvqAnm6wbrV3YLtzqk@19Rzg1Xryg5MYinDtpG6k96UgxF26WYZ3izx3gXsJ9AmnynWq7j5x3Ak6bAaf7BipqEGF5LHtzmvvLjFRFZ9rE9dfzbYtQ',
          'P12S51EKn4h7NYVLKk2AXycPzPECGCupuFS6DTeMe1yWmGqrnQ2n@1GKKBGeSdin3yy4kzzB7gCbB867BKcjbhj5xykSNiRUmWCUPHhVWDEoErCb3XicqGpxf4CYuVBTUGxDuioLsLH8EgL16Ku',
          'P12TJwFzkrgT5fQ3gJiUTpeQei6D2kQV2SRCoHhNbcXj4CqDoQkC@1VSZfWMUMtaYh5whfsbg9ZFRvWy6H5Y1JueEM4S1xugFgc3L1pHM1vJP7N7uohJFzXtT6FvSvQsrWN5d2Qsvakv8UK2kAg',
          'P12W6zgQb5aykbYSz4CfQLuk3axRcp5jYX1fmBT7VRdgVnzv6oHH@1Q9up1xEHT328KtDYkkgPwBG1F5s8bE1TGMMSTspNea1oXmaL4Cz3ABjETJ6XxMq2wcADupvmg6c3hNGrqTMUViUpyWFgn',
          'P12grHhPHfvRhujjLfdDzN4yvoPC1XkdehPVW7HB9kjJkXDzKXJL@1KUPufyTWGuGhJU7uosGXx79bc3EkaEPBXyYwEZnNdyPv7yw2KavpqMDKYaWLBgjcBTDbg1bSFoiKZLPeQr3yi4mx7YSw6',
        ],
      };

      const umbrellaFeeds = UmbrellaFeedsContractFactory.create(blockchainRepo.get(chainId));
      // await (umbrellaFeeds as UmbrellaFeedsConcordium).contractSetup();
      console.log('umbrellaFeeds', await umbrellaFeeds.address());
      console.log('bank', await bank.address());

      const privateKey1 = process.env.TEST_SIGNING_PRIVATE_KEY1 || '';
      const privateKey2 = process.env.TEST_SIGNING_PRIVATE_KEY2 || '';

      settings.blockchain.wallets[chainId].privateKey = privateKey1;
      settings.blockchain.wallets[chainId].privateKey = privateKey2;

      const payableOverrides: PayableOverrides = {};
      const executed = await umbrellaFeeds.update(args, payableOverrides);

      console.log({executed});

      const success = await blockchainRepo.get(chainId).provider.waitForTx(executed.hash, 65000);
      console.log('success:', success);

      console.log(await umbrellaFeeds.getManyPriceDataRaw(args.keys));
      expect(success).true;
    }).timeout(85000);
  });
});
