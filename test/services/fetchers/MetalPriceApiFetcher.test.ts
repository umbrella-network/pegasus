import chai from 'chai';

import Application from '../../../src/lib/Application.js';
import MetalPriceApiFetcher, {MetalPriceApiInputParams} from '../../../src/services/fetchers/MetalPriceApiFetcher.js';

const {expect} = chai;

describe.skip('MetalPriceApiFetcher (this test needs API key)', () => {
  const fetcher = Application.get(MetalPriceApiFetcher);

  const input: MetalPriceApiInputParams = {
    symbol: 'XAU',
    currency: 'USD',
  };

  describe('#apply', () => {
    describe('with valid parameters', () => {
      let output = 0;

      before(async () => {
        output = await fetcher.apply(input, {base: 'SILVER', quote: 'USD'});
      });

      it('returns the proper response format', () => {
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
