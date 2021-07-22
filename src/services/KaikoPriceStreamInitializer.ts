import {inject, injectable} from 'inversify';
import {loadFeeds} from '@umb-network/toolbox';
import {Logger} from 'winston';

import KaikoPriceStreamClient from './stream/KaikoPriceStreamClient';
import {Pair} from '../types/Feed';
import Settings from '../types/Settings';

@injectable()
class KaikoPriceStreamInitializer {
  @inject(KaikoPriceStreamClient) kaikoPriceStreamClient!: KaikoPriceStreamClient;
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;

  // calculate minutes
  fileUpdateInterval = 5 * 60 * 1000;

  async apply(): Promise<void> {
    let initialPairs = await this.allPairs();
    this.kaikoPriceStreamClient.start(initialPairs);

    // Update subscriptions routine
    setInterval(async () => {
      const newPairs = await this.allPairs();

      if (JSON.stringify(initialPairs) != JSON.stringify(newPairs)) {
        this.logger.info('Feeds file updated, updating stream feeds');
        this.kaikoPriceStreamClient.close();
        this.kaikoPriceStreamClient.start(newPairs);
        initialPairs = newPairs;
      }
    }, this.fileUpdateInterval);
  }

  async allPairs(): Promise<Pair[]> {
    return KaikoPriceStreamInitializer.allPairs(this.settings.feedsFile, this.settings.feedsOnChain);
  }

  static async allPairs(...files: string[]): Promise<Pair[]> {
    const feeds = await Promise.all(files.map(loadFeeds));

    return (
      feeds
        .map((feed) => Object.values(feed))
        .flat(1)
        .map((value) => value.inputs)
        .flat()
        .filter(({fetcher}) => fetcher.name === 'KaikoPriceStream')
        .map(({fetcher}) => fetcher.params)
        // eslint-disable-next-line
        .map(({fsym, tsym}: any) => ({fsym, tsym}))
    );
  }
}

export default KaikoPriceStreamInitializer;
