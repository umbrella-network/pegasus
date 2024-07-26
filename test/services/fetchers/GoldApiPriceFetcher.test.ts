import chai from 'chai';

import GoldApiPriceMultiFetcher from '../../../src/services/fetchers/GoldApiPriceFetcher.js';
import Application from '../../../src/lib/Application.js';

const {expect} = chai;

describe.skip('GoldApiPriceFetcher (to run them we need API keys)', () => {
  const fetcher = Application.get(GoldApiPriceMultiFetcher);

  describe('#apply', () => {
    describe('with valid parameters', () => {
      it('returns the proper response format', async () => {
        const output = await fetcher.apply(
          {
            symbol: 'XAU',
            currency: 'USD',
          },
          {base: 'GOLD', quote: 'USD'},
        );
        expect(output).greaterThan(0);
      });
    });

    describe('with invalid parameters', () => {
      it('rejects', async () => {
        await expect(
          fetcher.apply(
            {
              symbol: 'StrangeSymbol',
              currency: 'StrangeCurrency',
            },
            {base: 'GOLD', quote: 'USD'},
          ),
        ).to.be.rejected;
      });
    });
  });
});
