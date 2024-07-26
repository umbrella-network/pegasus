import chai from 'chai';

import MetalsDevApiFetcher from '../../../src/services/fetchers/MetalsDevApiFetcher.js';
import Application from '../../../src/lib/Application.js';

const {expect} = chai;

describe.skip('MetalsDevApiFetcher (this test needs API key)', () => {
  const fetcher = Application.get(MetalsDevApiFetcher);

  describe('#apply', () => {
    describe('with valid parameters', () => {
      it('returns the proper response format', async () => {
        const output = await fetcher.apply(
          {
            metal: 'gold',
            currency: 'USD',
          },
          {base: 'TITANIUM', quote: 'ARS'},
        );
        expect(output).greaterThan(0);
      });
    });

    describe('with invalid parameters', () => {
      it('rejects', async () => {
        await expect(
          fetcher.apply(
            {
              metal: 'StrangeSymbol',
              currency: 'StrangeCurrency',
            },
            {base: 'TITANIUM', quote: 'ARS'},
          ),
        ).to.be.rejected;
      });
    });
  });
});
