import {inject, injectable} from 'inversify';

import {loadFeeds} from '@umb-network/toolbox';
import {Pair} from '../types/Feed';
import Settings from '../types/Settings';

@injectable()
class PairRepository {
  @inject('Settings') settings!: Settings;

  async getPairsByFetcher(fetcherName: string): Promise<Pair[]> {
    const files = [this.settings.feedsFile, this.settings.feedsOnChain];
    const feeds = await Promise.all(files.map(loadFeeds));

    return (
      feeds
        .map((feed) => Object.values(feed))
        .flat(1)
        .map((value) => value.inputs)
        .flat()
        .filter(({fetcher}) => fetcher.name === fetcherName)
        .map(({fetcher}) => fetcher.params)
        // eslint-disable-next-line
        .map(({fsym, tsym}: any) => ({fsym, tsym}))
    );
  }
}

export default PairRepository;
