import 'reflect-metadata';
import {expect} from 'chai';

import {BlockchainRepository} from '../../../src/repositories/BlockchainRepository';
import settings from '../../../src/config/settings';
import {loadTestEnv} from '../../helpers/loadTestEnv';
import {ChainsIds} from '../../../src/types/ChainsIds';
import {StakingBankInterface} from '../../../src/interfaces/StakingBankInterface';
import {StakingBankContractFactory} from '../../../src/factories/contracts/StakingBankContractFactory';

loadTestEnv();

describe.skip('Staking Banks debug integration tests', () => {
  let blockchainRepo: BlockchainRepository;

  before(() => {
    blockchainRepo = new BlockchainRepository(settings);
  });

  [ChainsIds.MASSA].forEach((chainId) => {
    describe(`[${chainId}] bank tests`, () => {
      let bank: StakingBankInterface;

      beforeEach(async () => {
        bank = StakingBankContractFactory.create(blockchainRepo.get(chainId));
        console.log('bank address', await bank.address());
      });

      it('#address', async () => {
        const addr = await bank.address();
        console.log(`${chainId} StakingBank: `, addr);

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

      it('#getNumberOfValidators', async () => {
        const getNumberOfValidators = await bank.getNumberOfValidators();
        console.log({getNumberOfValidators});
        expect(getNumberOfValidators).gt(0);
      });

      it('#resolveValidators', async () => {
        const addr = await bank.resolveValidators();
        console.log(addr);
        expect(addr.length).gt(0);
      }).timeout(10000);
    });
  });
});
