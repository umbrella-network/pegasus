import chai from 'chai';

import {MetalsDevApiGetter} from '../../../src/services/fetchers/MetalsDevApiGetter.js';
import Application from '../../../src/lib/Application.js';

const {expect} = chai;

describe.skip('MetalsDevApiFetcher (this test needs API key)', () => {
  const fetcher = Application.get(MetalsDevApiGetter);

  describe('#apply', () => {
    describe('with valid parameters', () => {
      it('returns the proper response format', async () => {
        const output = await fetcher.apply([{metal: 'gold', currency: 'USD'}], {
          symbols: ['TITANIUM-ARS'],
          timestamp: 1,
        });
        expect(output).greaterThan(0);
      });
    });

    describe('with invalid parameters', () => {
      it('rejects', async () => {
        await expect(
          fetcher.apply([{metal: 'StrangeSymbol', currency: 'StrangeCurrency'}], {
            symbols: ['TITANIUM-ARS'],
            timestamp: 1,
          }),
        ).to.be.rejected;
      });
    });
  });
});
