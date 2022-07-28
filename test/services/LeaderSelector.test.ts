import 'reflect-metadata';
import {expect} from 'chai';

import LeaderSelector from '../../src/services/multiChain/LeaderSelector';
import {ChainStatus} from '../../src/types/ChainStatus';
import {chainStatusFactory} from '../mocks/factories/chainStatusFactory';

describe('LeaderSelector', () => {
  let chainStatus: ChainStatus;

  it('throws when no validators', () => {
    chainStatus = chainStatusFactory.build({validators: []});

    expect(() => LeaderSelector.apply(1, chainStatus)).to.throw;
  });

  it('expect to return single validator', () => {
    chainStatus = chainStatusFactory.build({validators: ['1']});
    expect(LeaderSelector.apply(1, chainStatus)).eq(chainStatus.validators[0]);
  });

  it('expect to have perfect rotation', () => {
    chainStatus = chainStatusFactory.build({validators: ['1', '2', '3']});
    let t = 1;
    let ix = LeaderSelector.getLeaderIndex(t, chainStatus);

    for (let i = 0; i < 100; i++) {
      expect(LeaderSelector.getLeaderIndex(t, chainStatus)).eq(ix);

      ix = (ix + 1) % chainStatus.validators.length;
      t += chainStatus.timePadding;
    }
  });
});
