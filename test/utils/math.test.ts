import chai from 'chai';
import dayjs from 'dayjs';

import {calcDiscrepancy} from '../../src/utils/math.js';

const {expect} = chai;

describe('calcDiscrepancy', () => {
  const round4 = (value: number) => Math.round(value * 1000000) / 1000000;

  it.only('dayjs', async () => {
    console.log(0, dayjs().add(0, 'days').toDate());
    console.log(0.5, dayjs().add(0.5, 'days').toDate());
    console.log(
      0.5,
      dayjs()
        .add(Math.trunc(0.5), 'days')
        .add(Math.trunc(24 * 60 * (0.5 % 1)), 'minutes')
        .toDate(),
    );
    console.log(1, dayjs().add(1, 'days').toDate());
    console.log(
      dayjs()
        .add(1.5, 'days')
        .add(24 * (1.5 % 1), 'hours')
        .toDate(),
    );
    console.log(
      dayjs()
        .add(1.5, 'days')
        .add(24 * (0 % 1), 'hours')
        .toDate(),
    );
  });

  it('no discrepancy', async () => {
    expect(calcDiscrepancy(10, 10, '')).to.be.eq(0);
    expect(calcDiscrepancy(1200, 1200, '')).to.be.eq(0);
    expect(calcDiscrepancy(1, 1, '')).to.be.eq(0);
  });

  it('has discrepancy', async () => {
    expect(round4(calcDiscrepancy(1.1, 1, ''))).to.be.eq(0.095238);
    expect(round4(calcDiscrepancy(11, 10, ''))).to.be.eq(0.095238);
    expect(round4(calcDiscrepancy(110, 100, ''))).to.be.eq(0.095238);
    expect(round4(calcDiscrepancy(1100, 1000, ''))).to.be.eq(0.095238);

    expect(round4(calcDiscrepancy(1, 1.1, ''))).to.be.eq(0.095238);
    expect(round4(calcDiscrepancy(10, 11, ''))).to.be.eq(0.095238);
    expect(round4(calcDiscrepancy(100, 110, ''))).to.be.eq(0.095238);
    expect(round4(calcDiscrepancy(1000, 1100, ''))).to.be.eq(0.095238);
  });
});
