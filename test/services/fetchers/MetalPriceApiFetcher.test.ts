import chai from 'chai';

import Application from '../../../src/lib/Application.js';
import MetalPriceApiFetcher, {
  MetalPriceApiInputParams,
  MetalPriceApiOutputValues,
} from '../../../src/services/fetchers/MetalPriceApiFetcher.js';

const {expect} = chai;

describe('MetalPriceApiFetcher', () => {
  const fetcher = Application.get(MetalPriceApiFetcher);

  const input: MetalPriceApiInputParams = {symbol: 'XAU', currency: 'USD'};

  describe('#apply', () => {
    describe('with valid parameters', () => {
      let output: MetalPriceApiOutputValues;

      before(async () => {
        output = await fetcher.apply(input);
      });

      it('returns the proper response format', () => {
        expect(output).to.have.property('symbol');
        expect(output).to.have.property('currency');
        expect(output).to.have.property('priceGram24k').greaterThan(0);
      });
    });

    describe('with invalid parameters', () => {
      it('rejects', async () => {
        await expect(
          fetcher.apply({
            symbol: 'StrangeSymbol',
            currency: 'StrangeCurrency',
          }),
        ).to.be.rejected;
      });
    });
  });
});
