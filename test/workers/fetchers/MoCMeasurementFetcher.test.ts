import chai from 'chai';

import Application from '../../../src/lib/Application.js';
import {MoCMeasurementFetcher} from '../../../src/workers/fetchers/MoCMeasurementFetcher.js';

const {expect} = chai;

describe.skip('MoCMeasurementFetcher - just for debugging', () => {
  const fetcher: MoCMeasurementFetcher = Application.get(MoCMeasurementFetcher);

  describe('#apply', () => {
    describe('with valid parameters', () => {
      it('returns the proper response format', async () => {
        const output = await fetcher.fetchPrice({measurement_id: 'rdocMainnet', fields: ['rifp_leverage']});
        expect(output).greaterThan(0);
      });
    });
  });
});
