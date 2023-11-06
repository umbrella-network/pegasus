/* eslint-disable @typescript-eslint/no-explicit-any */
import 'reflect-metadata';

import {RegistryContractFactory} from '../../../src/factories/contracts/RegistryContractFactory';
import {BlockchainRepository} from '../../../src/repositories/BlockchainRepository';
import settings from '../../../src/config/settings';
import {RegistryInterface} from '../../../src/interfaces/RegistryInterface';
import {loadTestEnv} from '../../helpers/loadTestEnv';
import {ChainsIds} from '../../../src/types/ChainsIds';
import {expect} from 'chai';

describe.skip('Registries debug integration tests', () => {
  let blockchainRepo: BlockchainRepository;

  before(() => {
    loadTestEnv();
    blockchainRepo = new BlockchainRepository(settings);
  });

  [ChainsIds.MASSA].forEach((chainId) => {
    describe(`[${chainId}] provider`, () => {
      let registry: RegistryInterface;

      beforeEach(() => {
        registry = RegistryContractFactory.create(blockchainRepo.get(chainId));
      });

      it('#getAddress', async () => {
        const addr = await registry.getAddress('StakingBank');
        console.log(`${chainId} StakingBank: `, addr);

        switch (chainId) {
          case ChainsIds.MULTIVERSX:
            expect(addr.length).eq(62);
            expect(addr.slice(0, 4)).eq('erd1');
            break;

          case ChainsIds.MASSA:
            expect(addr.length).eq(57);
            expect(addr.slice(0, 3)).eq('5AS');
            break;

          default:
            expect(addr.slice(0, 2)).eq('0x');
            expect(addr.length).eq(42);
        }
      }).timeout(5000);
    });
  });
});
