import 'reflect-metadata';
import {expect} from 'chai';

import {getTestContainer} from '../../helpers/getTestContainer';
import {MultiChainStatusProcessor} from '../../../src/services/multiChain/MultiChainStatusProcessor';
import {ChainsIds} from '../../../src/types/ChainsIds';
import {ChainStatusWithAddress} from '../../../src/types/ChainStatus';
import {chainStatusWithAddressFactory, chainStatusFactory} from '../../mocks/factories/chainStatusFactory';

describe('MultiChainStatusProcessor', () => {
  let chainStatusWithAddress: ChainStatusWithAddress[];
  let multiChainStatusProcessor: MultiChainStatusProcessor;
  const bscChainStatus = chainStatusWithAddressFactory.build();
  const chainsIds = Object.values(ChainsIds);

  chainStatusWithAddress = [
    bscChainStatus,
    {
      chainId: 'avax',
      chainAddress: '0x123',
      chainStatus: chainStatusFactory.build(),
    },
    {
      chainId: 'polygon',
      chainAddress: '0x456',
      chainStatus: chainStatusFactory.build(),
    },
  ];

  beforeEach(() => {
    const container = getTestContainer();
    container.bind(MultiChainStatusProcessor).toSelf();
    multiChainStatusProcessor = container.get(MultiChainStatusProcessor);
  });

  describe('when all chains can mint', () => {
    it('returns the chainsIdsReadyForBlock for all chains', async () => {
      const result = await multiChainStatusProcessor.apply(chainStatusWithAddress, 10);

      chainsIds.forEach((chain) => {
        expect(result.chainsStatuses.some((chainStatus) => chainStatus.chainId === chain)).to.be.true;
      });

      expect(result.chainsIdsReadyForBlock).to.have.members(chainsIds);
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
          chainAddress: '0x678',
          chainStatus: chainStatusFactory.build({
            lastDataTimestamp: 100,
          }),
        },
        {
          chainId: 'polygon',
          chainAddress: '0x456',
          chainStatus: chainStatusFactory.build({
            lastDataTimestamp: 100,
          }),
        },
      ];
    });

    it('returns the chainsIdsReadyForBlock for the one chain that can mint', async () => {
      const result = await multiChainStatusProcessor.apply(chainStatusWithAddress, 10);

      chainsIds.forEach((chain) => {
        expect(result.chainsStatuses.some((chainStatus) => chainStatus.chainId === chain)).to.be.true;
      });

      expect(result.chainsIdsReadyForBlock).to.deep.equal(['bsc']);
    });
  });
});
