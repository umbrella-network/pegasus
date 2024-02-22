import 'reflect-metadata';
import chai from 'chai';

import {BlockchainRepository} from '../../../src/repositories/BlockchainRepository.js';
import {loadTestEnv} from '../../helpers/loadTestEnv.js';
import {ChainsIds} from '../../../src/types/ChainsIds.js';
import {StakingBankInterface} from '../../../src/interfaces/StakingBankInterface.js';
import {StakingBankContractFactory} from '../../../src/factories/contracts/StakingBankContractFactory.js';
import {getTestContainer} from '../../helpers/getTestContainer.js';

loadTestEnv();

const {expect} = chai;

describe.skip('Staking Banks debug integration tests', () => {
  let blockchainRepo: BlockchainRepository;

  before(() => {
    const container = getTestContainer();
    container.bind(BlockchainRepository).toSelf();
    blockchainRepo = container.get(BlockchainRepository);
  });

  [ChainsIds.MULTIVERSX].forEach((chainId) => {
    describe(`[${chainId}] bank tests`, () => {
      let bank: StakingBankInterface;

      beforeEach(async () => {
        bank = StakingBankContractFactory.create(blockchainRepo.get(chainId));
        console.log('bank address', await bank.address());
      });

      it(`[${chainId}] #address`, async () => {
        const addr = await bank.address();
        console.log(`${chainId} StakingBank: `, addr);

        switch (chainId) {
          case ChainsIds.MULTIVERSX:
            expect(addr.length).eq(62);
            expect(addr.slice(0, 4)).eq('erd1');
            break;

          case ChainsIds.CONCORDIUM:
            expect(addr.split(',').length).eq(2);
            break;

          default:
            expect(addr.slice(0, 2)).eq('0x');
            expect(addr.length).eq(42);
        }
      }).timeout(5000);

      it(`[${chainId}] #getNumberOfValidators`, async () => {
        const getNumberOfValidators = await bank.getNumberOfValidators();
        console.log({getNumberOfValidators});
        expect(getNumberOfValidators).gt(0);
      });

      it(`[${chainId}] #resolveValidators`, async () => {
        const addr = await bank.resolveValidators();
        console.log(addr);
        console.log(addr.length);
        expect(addr.length).gt(0);
      }).timeout(10000);
    });
  });
});
