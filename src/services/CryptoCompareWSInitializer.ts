import {inject, injectable} from 'inversify';
import CryptoCompareWSClient from './ws/CryptoCompareWSClient';
import loadFeeds from '../config/loadFeeds';
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
    const [feeds, onChainFeeds] = await Promise.all([
      loadFeeds(this.settings.feedsFile),
      loadFeeds(this.settings.feedsOnChain)
    ]);

    const pairs: Pair[] = [...Object.values(feeds), ...Object.values(onChainFeeds)]
      .map((value) => value.inputs).flat()
      .filter(({fetcher}) => fetcher.name === 'CryptoComparePriceWS')
      .map(({fetcher}) => fetcher.params)
      .map(({fsym, tsym}: any) => ({fsym, tsym}));

    this.cryptoCompareWSClient.subscribe(...pairs);
  }
}

export default CryptoCompareWSInitializer;
