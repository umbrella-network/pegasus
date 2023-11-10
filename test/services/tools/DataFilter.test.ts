import chai from 'chai';
import {DataFilter} from '../../../src/services/tools/DataFilter.js';

const {expect} = chai;

describe('DataFilter', () => {
  describe('filter', () => {
    const data = {ETH: 0.55, BNB: 0.25, AVAX: 0.15};

    const acceptedKeys = ['ETH', 'AVAX'];

    it('should return only the data associated with the accepted keys', () => {
      const result = DataFilter.filter<number>(data, acceptedKeys);

      expect(result).to.be.eql({ETH: 0.55, AVAX: 0.15});
    });
  });

  describe('mutate', () => {
    it('should return an empty array when all accepted keys are part of the provided data', () => {
      const data = {ETH: 0.55, BNB: 0.25, AVAX: 0.15};
      const acceptedKeys = ['ETH', 'AVAX', 'BNB'];

      const result = DataFilter.mutate<number>(data, acceptedKeys);

      expect(result).to.be.eql([]);
    });

    it('should return a list of the removed keys, which are not present in the accepted list', () => {
      const data = {ETH: 0.55, BNB: 0.25, AVAX: 0.15};
      const acceptedKeys = ['ETH', 'AVAX'];

      const result = DataFilter.mutate<number>(data, acceptedKeys);

      expect(result).to.be.eql(['BNB']);
      expect(data).to.be.eql({ETH: 0.55, AVAX: 0.15});
    });
  });
});
