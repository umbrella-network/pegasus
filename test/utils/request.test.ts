import chai from 'chai';

import {timeoutWithCode} from '../../src/utils/request.js';
import {TimeoutCodes} from '../../src/types/TimeoutCodes.js';

const {expect} = chai;

describe('timeoutWithCode', () => {
  it('generate timeout with code', async () => {
    expect(timeoutWithCode(100, TimeoutCodes.POLYGON_IO)).to.be.eq(103);
    expect(timeoutWithCode(101, TimeoutCodes.POLYGON_IO)).to.be.eq(103);
  });

  it('throw on timeout less than max code value', async () => {
    const maximumCodeValue = 10 ** (Object.keys(TimeoutCodes).length / 2).toString(10).length;

    expect(() => timeoutWithCode(maximumCodeValue - 1, TimeoutCodes.POLYGON_IO)).to.throw;
    expect(() => timeoutWithCode(maximumCodeValue, TimeoutCodes.POLYGON_IO)).to.not.throw;
  });
});
