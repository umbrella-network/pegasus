import {expect} from 'chai';
import {MultiversXAddress} from "../../../src/services/tools/MultiversXAddress";

describe('MultiversXAddress', () => {
    it('#sort', () => {
      const addreses = [
        'erd1j9zhteusw3u7vckrrl2nqz82phk2l2tzwt52ukej3kmmaprnfv4s7erwzr',
        'erd1skx07r2wurg73krngq6htmnyyg3le5uy2yd2v6wv39v2qx6f204qmjnykm'
      ];

      const sorted = addreses.sort(MultiversXAddress.sort);
      expect(sorted[0] == addreses[1]);
      expect(sorted[1] == addreses[0]);

      const sorted2 = [addreses[1], addreses[0]].sort(MultiversXAddress.sort);
      expect(sorted2[0] == addreses[1]);
      expect(sorted2[1] == addreses[0]);
  });
});
