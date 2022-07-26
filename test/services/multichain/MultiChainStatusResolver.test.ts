import 'reflect-metadata';
import sinon from 'sinon';
import {expect} from 'chai';

import {getTestContainer} from '../../helpers/getTestContainer';
import {MultiChainStatusResolver} from '../../../src/services/multiChain/MultiChainStatusResolver';

import {ChainContractRepository} from '../../../src/repositories/ChainContractRepository';
import ChainContract from '../../../src/contracts/ChainContract';
import {chainStatusFactory} from '../../mocks/factories/chainStatusFactory';
import {Wallet} from 'ethers';
import {timestamp} from '../../../src/utils/mining';
import {ChainsIds} from '../../../src/types/ChainsIds';
import {MultiChainStatusProcessor} from '../../../src/services/multiChain/MultiChainStatusProcessor';
import {MultiChainStatuses} from '../../../src/types/MultiChain';
import TimeService from '../../../src/services/TimeService';

describe('MultiChainStatusResolver', () => {
  let mockedChainContractRepository: sinon.SinonStubbedInstance<ChainContractRepository>;
  let mockedMultiChainStatusProcessor: sinon.SinonStubbedInstance<MultiChainStatusProcessor>;
  let multiChainStatusResolver: MultiChainStatusResolver;
  const nextLeader = Wallet.createRandom();
  const timeService = new TimeService();

  beforeEach(async () => {
    const container = getTestContainer();
    const mockedContract = sinon.createStubInstance(ChainContract);

    mockedContract.resolveStatus.resolves([
      '0x123',
      chainStatusFactory.build({
        nextLeader: nextLeader.address,
        validators: [Wallet.createRandom().address],
        lastDataTimestamp: timestamp() - 100,
      }),
    ]);

    mockedChainContractRepository = sinon.createStubInstance(ChainContractRepository, {get: mockedContract});
    mockedMultiChainStatusProcessor = sinon.createStubInstance(MultiChainStatusProcessor);

    container.bind(ChainContractRepository).toConstantValue(mockedChainContractRepository);
    container.bind(MultiChainStatusProcessor).toConstantValue(mockedMultiChainStatusProcessor);
    container.bind(MultiChainStatusResolver).toSelf();

    multiChainStatusResolver = container.get(MultiChainStatusResolver);
  });

  describe('when all promises are resolved', () => {
    beforeEach(() => {
      const chainStatusWithAddress: MultiChainStatuses = {
        validators: ['0xabctest'],
        nextLeader: '1',
        chainsStatuses: [
          {
            chainId: 'bsc',
            chainAddress: '0x123',
            chainStatus: chainStatusFactory.build(),
          },
        ],
        chainsIdsReadyForBlock: ['bsc'],
      };

      mockedMultiChainStatusProcessor.apply.returns(chainStatusWithAddress);
    });

    it('returns the chainsStatuses for all chains', async () => {
      const result = await multiChainStatusResolver.apply(timeService.apply());

      Object.values(ChainsIds).forEach((chain, i) => {
        expect(result.chainsStatuses[i]).to.includes({chainId: chain});
      });

      expect(result.chainsIdsReadyForBlock).to.deep.equal(Object.values(ChainsIds));
    });
  });
});
