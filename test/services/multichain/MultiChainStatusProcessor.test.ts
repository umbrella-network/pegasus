import 'reflect-metadata';
import chai from 'chai';
import mongoose from 'mongoose';
import sinon from 'sinon';
import {BigNumber} from 'ethers';

import {getTestContainer} from '../../helpers/getTestContainer.js';
import {MultiChainStatusProcessor} from '../../../src/services/multiChain/MultiChainStatusProcessor.js';
import {ChainStatusWithAddress} from '../../../src/types/ChainStatus.js';
import {chainStatusWithAddressFactory, chainStatusFactory} from '../../mocks/factories/chainStatusFactory.js';
import {loadTestEnv} from '../../helpers/loadTestEnv.js';
import {ValidatorRepository} from '../../../src/repositories/ValidatorRepository.js';
import {Validator} from '../../../src/types/Validator.js';

const {expect} = chai;

describe('MultiChainStatusProcessor', () => {
  const bscChainStatus = chainStatusWithAddressFactory.build();
  let mockValidatorRepository: sinon.SinonStubbedInstance<ValidatorRepository>;
  let chainStatusWithAddress: ChainStatusWithAddress[];
  let multiChainStatusProcessor: MultiChainStatusProcessor;

  chainStatusWithAddress = [
    bscChainStatus,
    {
      chainId: 'avax',
      chainAddress: '0x456',
      chainStatus: chainStatusFactory.build(),
    },
  ];

  before(async () => {
    const config = loadTestEnv();
    await mongoose.connect(config.MONGODB_URL, {useNewUrlParser: true, useUnifiedTopology: true});
  });

  beforeEach(() => {
    const container = getTestContainer();

    mockValidatorRepository = sinon.createStubInstance(ValidatorRepository);

    container.bind(MultiChainStatusProcessor).toSelf();
    container.bind(ValidatorRepository).toConstantValue(mockValidatorRepository);

    multiChainStatusProcessor = container.get(MultiChainStatusProcessor);
  });

  describe('when all chains can mint', () => {
    it('returns the chainsIdsReadyForBlock for all chains', async () => {
      mockValidatorRepository.list.resolves([<Validator>{id: 'a', location: 'b', power: BigNumber.from(1)}]);

      const result = await multiChainStatusProcessor.apply(chainStatusWithAddress, 10);

      expect(result.chainsStatuses[0]).to.includes({chainId: 'bsc'});
      expect(result.chainsIdsReadyForBlock).to.deep.equal(['bsc', 'avax']);
    });
  });

  describe('when one chains can mint', () => {
    beforeEach(() => {
      chainStatusWithAddress = [
        {
          chainId: 'bsc',
          chainAddress: '0x123',
          chainStatus: chainStatusFactory.build(),
        },
        {
          chainId: 'avax',
          chainAddress: '0x456',
          chainStatus: chainStatusFactory.build({
            lastDataTimestamp: 100,
          }),
        },
      ];
    });

    it('returns the chainsIdsReadyForBlock for the one chain that can mint', async () => {
      mockValidatorRepository.list.resolves([<Validator>{id: 'a', location: 'b', power: BigNumber.from(1)}]);

      const result = await multiChainStatusProcessor.apply(chainStatusWithAddress, 10);
      expect(result.chainsStatuses[0]).to.includes({chainId: 'bsc'});
      expect(result.chainsIdsReadyForBlock).to.deep.equal(['bsc']);
    });
  });
});
