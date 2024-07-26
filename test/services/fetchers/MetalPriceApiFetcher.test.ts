import chai from 'chai';

import MetalPriceApiFetcher from '../../../src/services/fetchers/MetalPriceApiFetcher.js';
import Application from '../../../src/lib/Application.js';

const {expect} = chai;

describe.skip('MetalPriceApiFetcher (this test needs API key)', () => {
  const fetcher = Application.get(MetalPriceApiFetcher);

  describe('#apply', () => {
    describe('with valid parameters', () => {
      it('returns the proper response format', async () => {
        const output = await fetcher.apply(
          {
            symbol: 'XAU',
            currency: 'USD',
          },
          {base: 'SILVER', quote: 'USD'},
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
            {base: 'SILVER', quote: 'USD', timestamp: -1},
          ),
        ).to.be.rejected;
      });
    });
  });
});
