import 'reflect-metadata';
import {expect} from 'chai';

import {getTestContainer} from '../../helpers/getTestContainer';
import {MultiChainStatusProcessor} from '../../../src/services/multiChain/MultiChainStatusProcessor';
import {ChainsIds} from '../../../src/types/ChainsIds';
import {ChainStatusWithAddress} from '../../../src/types/MultiChain';
import {chainStatusFactory} from '../../mocks/factories/chainStatusFactory';

describe('MultiChainStatusProcessor', () => {
  let multiChainStatusProcessor: MultiChainStatusProcessor;
  let chainStatusWithAddress: ChainStatusWithAddress[];

  chainStatusWithAddress = [
    {
      chainId: 'bsc',
      chainAddress: '0x123',
      chainStatus: chainStatusFactory.build(),
    },
    {
      chainId: 'avax',
      chainAddress: '0x456',
      chainStatus: chainStatusFactory.build(),
    },
  ];

  beforeEach(async () => {
    const container = getTestContainer();
    container.bind(MultiChainStatusProcessor).toSelf();
    multiChainStatusProcessor = container.get(MultiChainStatusProcessor);
  });

  describe('when all chains can mint', () => {
    it('returns the chainsIdsReadyForBlock for all chains', async () => {
      const result = await multiChainStatusProcessor.apply(chainStatusWithAddress, 10);

      Object.values(ChainsIds).forEach((chain, i) => {
        expect(result.chainsStatuses[i]).to.includes({chainId: chain});
      });

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

      Object.values(ChainsIds).forEach((chain, i) => {
        expect(result.chainsStatuses[i]).to.includes({chainId: chain});
      });

      expect(result.chainsIdsReadyForBlock).to.deep.equal(['bsc']);
    });
  });
});
