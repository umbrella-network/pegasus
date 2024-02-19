import chai from 'chai';

import Application from '../../../src/lib/Application.js';
import GoldApiPriceMultiFetcher, { GoldApiInputParams, GoldApiOutputValues } from '../../../src/services/fetchers/GoldApiPriceFetcher.js';

const {expect} = chai;

describe('GoldApiPriceFetcher', () => {
  const fetcher = Application.get(GoldApiPriceMultiFetcher);

  const input: GoldApiInputParams = {symbol: 'XAU', currency: 'USD'};

  describe('#apply', () => {
    describe('with valid parameters', () => {
      let output: GoldApiOutputValues;

      before(async () => {
        output = await fetcher.apply(input);
      });

      it('returns the proper response format', () => {
        console.log(output);

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
