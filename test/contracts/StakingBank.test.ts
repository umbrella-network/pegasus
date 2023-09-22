import 'reflect-metadata';
import {expect} from 'chai';

import {BlockchainRepository} from '../../src/repositories/BlockchainRepository';
import settings from '../../src/config/settings';
import {loadTestEnv} from '../helpers/loadTestEnv';
import {ChainsIds} from '../../src/types/ChainsIds';
import {StakingBankInterface} from '../../src/contracts/interfaces/StakingBankInterface';
import {StakingBankContractFactory} from '../../src/factories/contracts/StakingBankContractFactory';
import {MultiversXAddress} from '../../src/services/tools/MultiversXAddress';

loadTestEnv();

describe.skip('Staking Banks debug integration tests', () => {
  let blockchainRepo: BlockchainRepository;

  before(() => {
    blockchainRepo = new BlockchainRepository(settings);
  });

  [ChainsIds.MULTIVERSX].forEach((chainId) => {
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
        expect(await bank.getNumberOfValidators()).gt(0);
      });

      it('#resolveValidators', async () => {
        const addr = await bank.resolveValidators();
        console.log(addr);
        const hex = addr.map((a) => MultiversXAddress.toAddressValue(a.id).valueOf().hex());
        console.log(hex.map((x) => [x, MultiversXAddress.fromHex(x).bech32()]));
        expect(addr.length).gt(0);
      }).timeout(10000);
    });
  });
});
