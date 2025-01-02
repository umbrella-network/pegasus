import chai from 'chai';
import {MassaAddress} from '../../../src/blockchains/massa/utils/MassaAddress.js';

const {expect} = chai;

describe('MassaAddress', () => {
  it('sort', async () => {
    const a1 = 'P12W6zgQb5aykbYSz4CfQLuk3axRcp5jYX1fmBT7VRdgVnzv6oHH';
    const a2 = 'P1QV6AsrtPdZqk9BVyMMfFCDgYEaMaSBatnCk8xs1jJzcMGNeFa';

    console.log('addr1', MassaAddress.toHex(a1));
    console.log('addr2', MassaAddress.toHex(a2));

    expect(MassaAddress.sort(a1, a2)).eq(1, 'a1 > a2');
  });
});
