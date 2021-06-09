import {inject, injectable} from 'inversify';
import CryptoCompareWSClient from './ws/CryptoCompareWSClient';
import {loadFeeds} from '@umb-network/toolbox';
import {Pair} from '../types/Feed';
import Settings from '../types/Settings';
import {Logger} from 'winston';

@injectable()
class CryptoCompareWSInitializer {
  @inject(CryptoCompareWSClient) cryptoCompareWSClient!: CryptoCompareWSClient;
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;

  fileUpdateInterval = 60 * 1000;

  async apply(): Promise<void> {
    this.cryptoCompareWSClient.start();

    return this.subscribeWS();
  }

  async subscribeWS(): Promise<void> {
    await this.updateWSSubscription();

    setInterval(() => {
      this.updateWSSubscription().catch(this.logger.error);
    }, this.fileUpdateInterval);
  }

  async updateWSSubscription(): Promise<void> {
    const pairs = await CryptoCompareWSInitializer.allPairs(this.settings.feedsFile, this.settings.feedsOnChain);

    this.cryptoCompareWSClient.subscribe(...pairs);
  }

  static async allPairs(...files: string[]): Promise<Pair[]> {
    const feeds = await Promise.all(files.map(loadFeeds));

    return feeds
      .map((feed) => Object.values(feed))
      .flat(1)
      .map((value) => value.inputs)
      .flat()
      .filter(({fetcher}) => fetcher.name === 'CryptoComparePriceWS')
      .map(({fetcher}) => fetcher.params)
      .map(({fsym, tsym}: any) => ({fsym, tsym}));
  }
}

export default CryptoCompareWSInitializer;
