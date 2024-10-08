import chai from 'chai';

import {MetalPriceApiGetter} from '../../../src/services/fetchers/MetalPriceApiGetter.js';
import Application from '../../../src/lib/Application.js';

const {expect} = chai;

describe.skip('MetalPriceApiFetcher (this test needs API key)', () => {
  const fetcher = Application.get(MetalPriceApiGetter);

  describe('#apply', () => {
    describe('with valid parameters', () => {
      it('returns the proper response format', async () => {
        const output = await fetcher.apply([{symbol: 'XAU', currency: 'USD'}], {symbols: ['SILVER-USD'], timestamp: 1});
        expect(output).greaterThan(0);
      });
    });

    describe('with invalid parameters', () => {
      it('rejects', async () => {
        await expect(
          fetcher.apply([{symbol: 'StrangeSymbol', currency: 'StrangeCurrency'}], {
            symbols: ['SILVER-USD'],
            timestamp: 1,
          }),
        ).to.be.rejected;
      });
    });
  });
});
