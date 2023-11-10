import 'reflect-metadata';
import sinon from 'sinon';
import chai from 'chai';
import {BigNumber, Wallet} from 'ethers';

import {getTestContainer} from '../../helpers/getTestContainer.js';
import {MultiChainStatusResolver} from '../../../src/services/multiChain/MultiChainStatusResolver.js';
import {ChainContractRepository} from '../../../src/repositories/ChainContractRepository.js';
import ChainContract from '../../../src/blockchains/evm/contracts/ChainContract.js';
import {chainStatusFactory} from '../../mocks/factories/chainStatusFactory.js';
import {timestamp} from '../../../src/utils/mining.js';
import {MultiChainStatusProcessor} from '../../../src/services/multiChain/MultiChainStatusProcessor.js';
import {ChainsStatuses} from '../../../src/types/ChainStatus.js';
import TimeService from '../../../src/services/TimeService.js';

const {expect} = chai;

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
      const chainStatusWithAddress: ChainsStatuses = {
        validators: [
          {id: '0xabctest', power: BigNumber.from(1), location: ''},
          {id: '0xdeftest', power: BigNumber.from(1), location: ''},
        ],
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

      mockedMultiChainStatusProcessor.apply.returns(Promise.resolve(chainStatusWithAddress));
    });

    it('returns the chainsStatuses for all chains', async () => {
      const result = await multiChainStatusResolver.apply(timeService.apply());
      expect(result.chainsStatuses[0]).to.includes({chainId: 'bsc'});
      expect(result.chainsIdsReadyForBlock).to.deep.equal(['bsc']);
    });
  });
});
