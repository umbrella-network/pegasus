import chai from 'chai';

import Application from '../../../src/lib/Application.js';
import {InputParams} from '../../../src/services/fetchers/CoingeckoPriceMultiFetcher.js';
import CoingeckoPriceMultiFetcher from '../../../src/services/fetchers/CoingeckoPriceMultiFetcher.js';

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
        const outputs = await fetcher.apply(multiInputs);

        expect(outputs).to.have.lengthOf(multiInputs.length);
      });

      it('each output contains the proper attributes', async () => {
        const outputs = await fetcher.apply(multiInputs);

        outputs.forEach((output) => {
          expect(output).to.have.property('id');
          expect(output).to.have.property('currency');
          expect(output).to.have.property('value').greaterThan(0);
        });
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
          const outputs = await fetcher.apply([validInput, invalidInput]);

          expect(outputs).to.have.lengthOf(1);
          expect(outputs[0]).to.haveOwnProperty('id', 'umbrella-network');
          expect(outputs[0]).to.haveOwnProperty('currency', 'USD');
          expect(outputs[0]).to.haveOwnProperty('value').greaterThan(0);
        });
      });

      describe('when there are all invalid coins', () => {
        it('returns empty array', async () => {
          const outputs = await fetcher.apply([invalidInput]);

          expect(outputs).to.eql([]);
        });
      });
    });
  });
});
