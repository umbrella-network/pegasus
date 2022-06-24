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

describe('MultiChainStatusResolver', () => {
  let mockedChainContractRepository: sinon.SinonStubbedInstance<ChainContractRepository>;
  let multiChainStatusResolver: MultiChainStatusResolver;
  const nextLeader = Wallet.createRandom();

  beforeEach(async () => {
    const container = getTestContainer();
    const mockedContract = sinon.createStubInstance(ChainContract);

    mockedContract.resolveStatus.resolves([
      '0x123',
      chainStatusFactory.build({
        nextLeader: nextLeader.address,
        validators: [Wallet.createRandom().address],
        lastDataTimestamp: timestamp(),
      }),
    ]);

    mockedChainContractRepository = sinon.createStubInstance(ChainContractRepository, {get: mockedContract});

    container.bind(ChainContractRepository).toConstantValue(mockedChainContractRepository);
    container.bind(MultiChainStatusResolver).toSelf();

    multiChainStatusResolver = container.get(MultiChainStatusResolver);
  });

  describe('when all promises are resolved', () => {
    it('returns the resolvedStatus from chain', async () => {
      const result = await multiChainStatusResolver.apply();

      expect(result).to.includes({isAnySuccess: true});
      Object.values(ChainsIds).forEach((chain, i) => {
        expect(result.resolved[i]).to.includes({chainId: chain});
      });
    });
  });
});
