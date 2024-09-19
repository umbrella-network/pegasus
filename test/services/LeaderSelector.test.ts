import 'reflect-metadata';
import chai from 'chai';

import {LeaderSelector} from '../../src/services/multiChain/LeaderSelector.js';
import {chainStatusFactory} from '../mocks/factories/chainStatusFactory.js';
import {Validator} from '../../src/types/Validator.js';
import {BigNumber} from 'ethers';

const {expect} = chai;

describe('LeaderSelector', () => {
  const roundLength = 60;
  const validator: Validator = {id: '1', location: '1', power: BigNumber.from(1)};

  it('throws when no validators', () => {
    expect(() => LeaderSelector.apply(1, [], roundLength)).to.throw;
  });

  it('expect to return single validator', () => {
    const validators = [validator];
    expect(LeaderSelector.apply(1, validators, roundLength)).eq(validators[0]);
  });

  it('expect to have perfect rotation', () => {
    const validators = [validator, {...validator, id: '2'}, {...validator, id: '3'}];
    let t = 1;
    let ix = LeaderSelector.getLeaderIndex(t, validators, roundLength);
    const timePadding = 60;

    for (let i = 0; i < 100; i++) {
      expect(LeaderSelector.getLeaderIndex(t, validators, roundLength)).eq(ix);

      ix = (ix + 1) % validators.length;
      t += timePadding;
    }
  });
});
