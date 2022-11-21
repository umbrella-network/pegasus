import {expect} from 'chai';

import Application from '../../../src/lib/Application';
import {InputParams, OutputValue} from '../../../src/services/fetchers/CryptoComparePriceMultiFetcher';
import CryptoComparePriceMultiFetcher from '../../../src/services/fetchers/CryptoComparePriceMultiFetcher';

describe.only('CryptoComparePriceMultiFetcher', () => {
  const params: InputParams = {
    fsyms: ['UMB', 'BTC'],
    tsyms: ['USD', 'EUR'],
  };

  const fetcher = Application.get(CryptoComparePriceMultiFetcher);

  describe('#apply', () => {
    describe('with valid parameters', () => {
      let outputs: OutputValue[];

      before(async () => {
        outputs = await fetcher.apply(params);
      });

      it('returns the prices for the outputs', () => {
        expect(outputs).to.have.lengthOf(4);
      });

      it('returns the proper response format', () => {
        outputs.forEach((output) => {
          expect(output).to.have.property('fsym');
          expect(output).to.have.property('tsym');
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
    });
  });
});
