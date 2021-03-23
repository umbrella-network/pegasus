import {inject, injectable} from 'inversify';
import CryptoCompareWSClient from './ws/CryptoCompareWSClient';
import loadFeeds from '../config/loadFeeds';
import {Pair} from '../types/Feed';
import Settings from '../types/Settings';

@injectable()
class CryptoCompareWSInitializer {
  @inject(CryptoCompareWSClient) cryptoCompareWSClient!: CryptoCompareWSClient;
  @inject('Settings') settings!: Settings;

  async apply(): Promise<void> {
    this.cryptoCompareWSClient.start();

    return this.subscribeWS();
  }

  async subscribeWS(): Promise<void> {
    const feeds = await loadFeeds(this.settings.feedsFile);
    const onChainFeeds = await loadFeeds(this.settings.feedsOnChain);

    const pairs: Pair[] = [...Object.values(feeds), ...Object.values(onChainFeeds)]
      .map((value) => value.inputs).flat()
      .filter(({fetcher}) => fetcher.name === 'CryptoComparePriceWS')
      .map(({fetcher}) => fetcher.params)
      .map(({fsym, tsym}: any) => ({fsym, tsym}));

    this.cryptoCompareWSClient.subscribe(...pairs);
  }
}

export default CryptoCompareWSInitializer;
