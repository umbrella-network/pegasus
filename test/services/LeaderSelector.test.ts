import 'reflect-metadata';
import {BigNumber} from 'ethers';
import {expect} from 'chai';
import {ChainStatusExtended} from '../../src/types/ChainStatus';
import LeaderSelector from '../../src/services/multiChain/LeaderSelector';

describe('LeaderSelector', () => {
  const chainStatus: ChainStatusExtended = {
    blockNumber: BigNumber.from(1),
    timePadding: 100,
    lastBlockId: 1,
    nextBlockId: 1,
    nextLeader: '',
    validators: [],
    locations: [],
    lastDataTimestamp: 1,
    powers: [BigNumber.from(1)],
    staked: BigNumber.from(1),
    minSignatures: 1,
    masterChain: true,
  };

  it('throws when no status for masterchain', () => {
    const status = {
      ...chainStatus,
      validators: ['1'],
      masterChain: false,
    };

    expect(() => LeaderSelector.apply(1, [status])).to.throw;
  });

  it('throws when no validators', () => {
    expect(() => LeaderSelector.apply(1, [chainStatus])).to.throw;
  });

  it('expect to return single validator', () => {
    const status = {
      ...chainStatus,
      validators: ['1'],
    };

    expect(LeaderSelector.apply(1, [status])).eq(status.validators[0]);
  });

  it('expect to have perfect rotation', () => {
    const status = {
      ...chainStatus,
      validators: ['1', '2', '3'],
    };

    let t = 1;
    let ix = LeaderSelector.getLeaderIndex(t, [status]);

    for (let i = 0; i < 100; i++) {
      expect(LeaderSelector.getLeaderIndex(t, [status])).eq(ix);

      ix = (ix + 1) % status.validators.length;
      t += status.timePadding;
    }
  });
});
