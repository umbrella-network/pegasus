import chai from 'chai';

import Application from '../../../src/lib/Application.js';
import MetalsDevApiFetcher, {
  MetalsDevApiInputParams,
  MetalsDevApiOutputValues,
} from '../../../src/services/fetchers/MetalsDevApiFetcher.js';

const {expect} = chai;

describe('MetalsDevApiFetcher', () => {
  const fetcher = Application.get(MetalsDevApiFetcher);

  const input: MetalsDevApiInputParams = {metal: 'gold', currency: 'USD'};

  describe('#apply', () => {
    describe('with valid parameters', () => {
      let output: MetalsDevApiOutputValues;

      before(async () => {
        output = await fetcher.apply(input);
      });

      it('returns the proper response format', () => {
        expect(output).to.have.property('metal');
        expect(output).to.have.property('currency');
        expect(output).to.have.property('priceGram24k').greaterThan(0);
      });
    });

    describe('with invalid parameters', () => {
      it('rejects', async () => {
        await expect(
          fetcher.apply({
            metal: 'StrangeSymbol',
            currency: 'StrangeCurrency',
          }),
        ).to.be.rejected;
      });
    });
  });
});
