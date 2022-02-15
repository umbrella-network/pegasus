import {expect} from 'chai';
import {timeoutWithCode} from '../../src/utils/request';
import {TimeoutCodes} from '../../src/types/TimeoutCodes';

describe('timeoutWithCode', () => {
  it('generate timeout with code', async () => {
    expect(timeoutWithCode(100, TimeoutCodes.IEX)).to.be.eq(106);
    expect(timeoutWithCode(101, TimeoutCodes.IEX)).to.be.eq(106);
  });

  it('throw on timeout less than max code value', async () => {
    const maximumCodeValue = 10 ** (Object.keys(TimeoutCodes).length / 2).toString(10).length;

    expect(() => timeoutWithCode(maximumCodeValue - 1, TimeoutCodes.IEX)).to.throw;
    expect(() => timeoutWithCode(maximumCodeValue, TimeoutCodes.IEX)).to.not.throw;
  });
});
