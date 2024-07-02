import chai from 'chai';

import Application from '../../../src/lib/Application.js';
import MetalsDevApiFetcher, {MetalsDevApiInputParams} from '../../../src/services/fetchers/MetalsDevApiFetcher.js';
import {FeedBaseQuote} from '../../../src/types/fetchers.js';

const {expect} = chai;

describe.skip('MetalsDevApiFetcher (this test needs API key)', () => {
  const fetcher = Application.get(MetalsDevApiFetcher);

  const input: MetalsDevApiInputParams & FeedBaseQuote = {
    metal: 'gold',
    currency: 'USD',
    feedBase: 'TITANIUM',
    feedQuote: 'ARS',
  };

  describe('#apply', () => {
    describe('with valid parameters', () => {
      let output = 0;

      before(async () => {
        output = await fetcher.apply(input);
      });

      it('returns the proper response format', () => {
        expect(output).greaterThan(0);
      });
    });

    describe('with invalid parameters', () => {
      it('rejects', async () => {
        await expect(
          fetcher.apply({
            metal: 'StrangeSymbol',
            currency: 'StrangeCurrency',
            feedBase: 'TITANIUM',
            feedQuote: 'ARS',
          }),
        ).to.be.rejected;
      });
    });
  });
});
