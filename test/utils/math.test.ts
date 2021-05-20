import {expect} from 'chai';
import {calcDiscrepancy} from '../../src/utils/math';

describe('calcDiscrepancy', () => {
  const round4 = (value: number) => Math.round(value * 1000000) / 1000000;

  it('no discrepancy', async () => {
    expect(calcDiscrepancy(10, 10)).to.be.eq(0);
    expect(calcDiscrepancy(1200, 1200)).to.be.eq(0);
    expect(calcDiscrepancy(1, 1)).to.be.eq(0);
  });

  it('has discrepancy', async () => {
    expect(round4(calcDiscrepancy(1.1, 1))).to.be.eq(0.095238);
    expect(round4(calcDiscrepancy(11, 10))).to.be.eq(0.095238);
    expect(round4(calcDiscrepancy(110, 100))).to.be.eq(0.095238);
    expect(round4(calcDiscrepancy(1100, 1000))).to.be.eq(0.095238);

    expect(round4(calcDiscrepancy(1, 1.1))).to.be.eq(0.095238);
    expect(round4(calcDiscrepancy(10, 11))).to.be.eq(0.095238);
    expect(round4(calcDiscrepancy(100, 110))).to.be.eq(0.095238);
    expect(round4(calcDiscrepancy(1000, 1100))).to.be.eq(0.095238);
  });
});
