import {expect} from 'chai';
import {Container} from 'inversify';

import PairRepository from '../../src/repositories/PairRepository';
import Settings from '../../src/types/Settings';

describe('BlockRepository', () => {
  let settings: Settings;
  let pairRepository: PairRepository;

  beforeEach(() => {
    const container = new Container();

    settings = {
      feedsFile: 'test/feeds/feeds.yaml',
      feedsOnChain: 'test/feeds/feedsOnChain.yaml',
    } as Settings;

    container.bind('Settings').toConstantValue(settings);
    container.bind(PairRepository).to(PairRepository);

    pairRepository = container.get(PairRepository);
  });

  describe('getPairsByFetcher', () => {
    it('returns a Pair array of a given fetcher name', async () => {
      const fetcherName = 'CryptoComparePriceWS';

      const pairs = await pairRepository.getPairsByFetcher(fetcherName);

      expect(pairs).to.have.length.greaterThan(2);
      expect(pairs[1]).to.have.property('fsym');
      expect(pairs[1]).to.have.property('tsym');
    });
  });
});
