import {expect} from 'chai';
import {LeavesToRecord} from '../../../src/services/tools/LeavesToRecord';
import Leaf from '../../../src/types/Leaf';

describe('LeavesToRecord', () => {
  describe('#apply', () => {
    it('should map leaves entries to record', () => {
      const leaves: Leaf[] = [
        {label: 'TEST1', valueBytes: '0x12345'},
        {label: 'TEST2', valueBytes: '0x67890'},
      ];
      const result = LeavesToRecord.apply(leaves);

      const expected: Record<string, Leaf> = {
        TEST1: {label: 'TEST1', valueBytes: '0x12345'},
        TEST2: {label: 'TEST2', valueBytes: '0x67890'},
      };

      expect(result).to.be.eql(expected);
    });
  });
});
