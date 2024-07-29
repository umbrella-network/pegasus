import chai from 'chai';

import Application from '../../../src/lib/Application.js';
import {InputParams} from '../../../src/services/fetchers/CoingeckoPriceFetcher.js';
import CoingeckoPriceMultiFetcher from '../../../src/services/fetchers/CoingeckoPriceFetcher.js';

const {expect} = chai;

describe('CoingeckoPriceMultiFetcher', () => {
  const fetcher = Application.get(CoingeckoPriceMultiFetcher);

  const multiInputs: InputParams[] = [
    {currency: 'USD', id: 'fortress'},
    {currency: 'USD', id: 'uno-re'},
    {currency: 'USD', id: 'umbrella-network'},
    {currency: 'ETH', id: 'umbrella-network'},
    {currency: 'BTC', id: 'umbrella-network'},
  ];

  describe.skip('#apply', () => {
    describe('when fetching valid keys', () => {
      it('returns the same length of inputs', async () => {
        const outputs = await fetcher.apply(multiInputs, {symbols: []});
        expect(outputs).to.have.lengthOf(multiInputs.length);
      });

      it('each output contains the proper attributes', async () => {
        const output = await fetcher.apply(multiInputs, {symbols: []});
        expect(output).to.have.property('prices');
      });
    });

    describe('when fetching invalid coins', () => {
      const invalidInput: InputParams = {
        currency: 'USD',
        id: 'invalid-coin',
      };

      const validInput: InputParams = {
        currency: 'USD',
        id: 'umbrella-network',
      };

      describe('when there is an invalid coin in the middle of valid coins', () => {
        it('returns only the valid coin', async () => {
          const output = await fetcher.apply([validInput, invalidInput], {symbols: []});
          expect(output.prices).to.have.lengthOf(1);
        });
      });

      describe('when there are all invalid coins', () => {
        it('returns empty array', async () => {
          const outputs = await fetcher.apply([invalidInput], {symbols: []});
          expect(outputs).to.eql([]);
        });
      });
    });
  });
});
