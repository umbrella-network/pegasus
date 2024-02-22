/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';
import chai from 'chai';

import {RegistryContractFactory} from '../../../src/factories/contracts/RegistryContractFactory.js';
import {BlockchainRepository} from '../../../src/repositories/BlockchainRepository.js';
import {RegistryInterface} from '../../../src/interfaces/RegistryInterface.js';
import {loadTestEnv} from '../../helpers/loadTestEnv.js';
import {ChainsIds} from '../../../src/types/ChainsIds.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';

const {expect} = chai;

describe.skip('Registries debug integration tests', () => {
  let blockchainRepo: BlockchainRepository;

  before(() => {
    loadTestEnv();
    const container = getTestContainer();
    container.bind(BlockchainRepository).toSelf();
    blockchainRepo = container.get(BlockchainRepository);
  });

  [ChainsIds.MULTIVERSX].forEach((chainId) => {
    describe(`[${chainId}] provider`, () => {
      let registry: RegistryInterface;

      beforeEach(() => {
        registry = RegistryContractFactory.create(blockchainRepo.get(chainId));
      });

      it(`[${chainId}] #getAddress`, async () => {
        const [addr, feeds] = await Promise.all([
          registry.getAddress('StakingBank'),
          registry.getAddress('UmbrellaFeeds'),
        ]);

        console.log(`${chainId} StakingBank: `, addr);
        console.log(`${chainId} feeds: `, feeds);

        switch (chainId) {
          case ChainsIds.MULTIVERSX:
            expect(addr.length).eq(62);
            expect(addr.slice(0, 4)).eq('erd1');
            break;

          case ChainsIds.MASSA:
            expect(addr.length).eq(57);
            expect(addr.slice(0, 3)).eq('5AS');
            break;

          case ChainsIds.CONCORDIUM:
            expect(addr.split(',').length).eq(2);
            break;

          default:
            expect(addr.slice(0, 2)).eq('0x');
            expect(addr.length).eq(42);
        }
      }).timeout(5000);
    });
  });
});
