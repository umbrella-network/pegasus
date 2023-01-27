import 'reflect-metadata';
import {expect} from 'chai';

import {getTestContainer} from '../../helpers/getTestContainer';
import {MultiChainStatusProcessor} from '../../../src/services/multiChain/MultiChainStatusProcessor';
import {ChainStatusWithAddress} from '../../../src/types/ChainStatus';
import {chainStatusWithAddressFactory, chainStatusFactory} from '../../mocks/factories/chainStatusFactory';
import {loadTestEnv} from "../../helpers/loadTestEnv";
import mongoose from "mongoose";

describe('MultiChainStatusProcessor', () => {
  let chainStatusWithAddress: ChainStatusWithAddress[];
  let multiChainStatusProcessor: MultiChainStatusProcessor;
  const bscChainStatus = chainStatusWithAddressFactory.build();

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
    container.bind(MultiChainStatusProcessor).toSelf();
    multiChainStatusProcessor = container.get(MultiChainStatusProcessor);
  });

  describe('when all chains can mint', () => {
    it('returns the chainsIdsReadyForBlock for all chains', async () => {
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
      const result = await multiChainStatusProcessor.apply(chainStatusWithAddress, 10);
      expect(result.chainsStatuses[0]).to.includes({chainId: 'bsc'});
      expect(result.chainsIdsReadyForBlock).to.deep.equal(['bsc']);
    });
  });
});
