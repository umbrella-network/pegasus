import 'reflect-metadata';
import chai from 'chai';

import LeaderSelector from '../../src/services/multiChain/LeaderSelector.js';
import {ChainStatus} from '../../src/types/ChainStatus.js';
import {chainStatusFactory} from '../mocks/factories/chainStatusFactory.js';

const {expect} = chai;

describe('LeaderSelector', () => {
  const roundLength = 60;
  let chainStatus: ChainStatus;

  it('throws when no validators', () => {
    chainStatus = chainStatusFactory.build({validators: []});
    expect(() => LeaderSelector.apply(1, chainStatus.validators, roundLength)).to.throw;
  });

  it('expect to return single validator', () => {
    chainStatus = chainStatusFactory.build({validators: ['1']});
    expect(LeaderSelector.apply(1, chainStatus.validators, roundLength)).eq(chainStatus.validators[0]);
  });

  it('expect to have perfect rotation', () => {
    chainStatus = chainStatusFactory.build({validators: ['1', '2', '3'], timePadding: roundLength});
    let t = 1;
    let ix = LeaderSelector.getLeaderIndex(t, chainStatus.validators, roundLength);

    for (let i = 0; i < 100; i++) {
      expect(LeaderSelector.getLeaderIndex(t, chainStatus.validators, roundLength)).eq(ix);

      ix = (ix + 1) % chainStatus.validators.length;
      t += chainStatus.timePadding;
    }
  });
});
