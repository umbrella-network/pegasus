import chai from 'chai';
import {KeyValuesToLeaves} from '../../../src/services/tools/KeyValuesToLeaves.js';
import {KeyValues} from '../../../src/types/SignedBlock.js';
import Leaf from '../../../src/types/Leaf.js';

const {expect} = chai;

describe('KeyValuesToLeaves', () => {
  describe('#apply', () => {
    it('should map key-value entries to leaves', () => {
      const keyValues: KeyValues = {TEST1: '0x12345', TEST2: '0x67890'};
      const result = KeyValuesToLeaves.apply(keyValues);

      const expected: Leaf[] = [
        {label: 'TEST1', valueBytes: '0x12345'},
        {label: 'TEST2', valueBytes: '0x67890'},
      ];

      expect(result).to.be.eql(expected);
    });
  });
});
