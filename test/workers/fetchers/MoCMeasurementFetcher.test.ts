import chai from 'chai';

import Application from '../../../src/lib/Application.js';
import {MoCMeasurementFetcher} from "../../../src/workers/fetchers/MoCMeasurementFetcher.js";

const {expect} = chai;

describe.only('MoCMeasurementFetcher', () => {
  const fetcher: MoCMeasurementFetcher = Application.get(MoCMeasurementFetcher);

  describe('#apply', () => {
    describe('with valid parameters', () => {
      it('returns the proper response format', async () => {
        const output = await fetcher.fetchPrice({measurement_id: 'mocMainnet2', fields: ['rifx_leverage']});
        console.log(output);
        expect(output).greaterThan(0);
      });
    });
  });
});
