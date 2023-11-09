import 'reflect-metadata';
import {Container} from 'inversify';
import chai, {expect} from 'chai';
import chaiAsPromised from 'chai-as-promised';
import * as calculators from '../../../src/services/calculators/index.js';

chai.use(chaiAsPromised);

describe('calculators.IdentityCalculator', () => {
  let identityCalculator: calculators.IdentityCalculator;

  beforeEach(async () => {
    const container = new Container();
    container.bind(calculators.IdentityCalculator).toSelf();
    identityCalculator = container.get(calculators.IdentityCalculator);
  });

  it('returns a key / value pair for the value is a number', async () => {
    const result = await identityCalculator.apply('ABC-*', [{key: 'a', value: 2}]);
    expect(result).to.eql([
      {
        key: 'ABC-a',
        value: 2,
      },
    ]);
  });

  it('returns a key / value pair for the value is a number', async () => {
    const result = await identityCalculator.apply('ABC-*', {key: 'a', value: 2});
    expect(result).to.eql([
      {
        key: 'ABC-a',
        value: 2,
      },
    ]);
  });

  it('returns a key / value pair for the value is a number', async () => {
    const result = await identityCalculator.apply('ABC', 3);
    expect(result).to.eql([
      {
        key: 'ABC',
        value: 3,
      },
    ]);
  });

  it('returns a key / value pair for the value is a number', async () => {
    const result = await identityCalculator.apply('ABC-*', null);
    expect(result).to.eql([]);
  });
});
