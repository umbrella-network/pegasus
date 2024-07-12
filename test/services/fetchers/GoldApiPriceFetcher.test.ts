import chai from 'chai';

import Application from '../../../src/lib/Application.js';
import GoldApiPriceMultiFetcher, {GoldApiInputParams} from '../../../src/services/fetchers/GoldApiPriceFetcher.js';

const {expect} = chai;

describe.skip('GoldApiPriceFetcher (to run them we need API keys)', () => {
  const fetcher = Application.get(GoldApiPriceMultiFetcher);

  const input: GoldApiInputParams = {
    symbol: 'XAU',
    currency: 'USD',
  };

  describe('#apply', () => {
    describe('with valid parameters', () => {
      let output = 0;

      before(async () => {
        output = await fetcher.apply(input, {base: 'GOLD', quote: 'USD'});
      });

      it('returns the proper response format', () => {
        console.log(output);
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
