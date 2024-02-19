import chai from 'chai';

import Application from '../../../src/lib/Application.js';
import {InputParams, OutputValue} from '../../../src/services/fetchers/CryptoComparePriceMultiFetcher.js';
import CryptoComparePriceMultiFetcher from '../../../src/services/fetchers/CryptoComparePriceMultiFetcher.js';
import MetalsApiPriceMultiFetcher, { MetalsApiInputParams, MetalsApiOutputValues } from '../../../src/services/fetchers/MetalsApiPriceMultiFetcher.js';

const {expect} = chai;

describe('MetalsApiPriceMultiFetcher', () => {
  const params: MetalsApiInputParams = {
    base: 'USD',
    outputSymbols: ['XAU', 'XAG', 'XPD'],
  };

  const fetcher = Application.get(MetalsApiPriceMultiFetcher);

  describe('#apply', () => {
    describe('with valid parameters', () => {
      let outputs: MetalsApiOutputValues[];

      before(async () => {
        outputs = await fetcher.apply(params);
      });

      it('returns the prices for the outputs', () => {
        expect(outputs).to.have.lengthOf(3);
      });

      it('returns the proper response format', () => {
        outputs.forEach((output) => {
          expect(output).to.have.property('base');
          expect(output).to.have.property('outputSymbol');
          expect(output).to.have.property('value').greaterThan(0);
        });
      });
    });

    describe('with all invalid parameters', () => {
      it('rejects', async () => {
        await expect(
          fetcher.apply({
            fsyms: ['StrangeSymbol'],
            tsyms: ['OtherSymbol'],
          }),
        ).to.be.rejected;
      });
    });

    describe('with one invalid parameter', () => {
      let outputs: OutputValue[];

      before(async () => {
        outputs = await fetcher.apply({
          fsyms: ['StrangeSymbol', 'UMB'],
          tsyms: ['OtherSymbol', 'USD'],
        });
      });

      it('returns only the valid parameter', () => {
        expect(outputs).to.have.lengthOf(1);
      });

      it('returns the proper response format', () => {
        expect(outputs[0]).to.have.property('fsym', 'UMB');
        expect(outputs[0]).to.have.property('tsym', 'USD');
        expect(outputs[0]).to.have.property('value').greaterThan(0);
      });
    }).timeout(10000);
  });
});
