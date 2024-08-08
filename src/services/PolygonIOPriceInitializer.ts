import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import PolygonIOCryptoPriceWSService from './fetchers/common/PolygonIOCryptoPriceWSService.js';
import PolygonIOStockPriceService from './PolygonIOStockPriceService.js';
import Settings from '../types/Settings.js';
import loadFeeds from './loadFeeds.js';
import {Pair} from '../types/Feed.js';
import {FetcherName} from '../types/fetchers.js';

@injectable()
class PolygonIOPriceInitializer {
  @inject(PolygonIOCryptoPriceWSService)
  polygonIOCryptoPriceService!: PolygonIOCryptoPriceWSService;
  @inject(PolygonIOStockPriceService) polygonIOStockPriceService!: PolygonIOStockPriceService;
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;

  fileUpdateInterval = 60 * 1000;

  async apply(): Promise<void> {
    this.polygonIOCryptoPriceService.start();
    this.polygonIOStockPriceService.start();

    return this.subscribeWS();
  }

  async subscribeWS(): Promise<void> {
    await this.updateWSSubscription();

    setInterval(() => {
      this.updateWSSubscription().catch(this.logger.error);
    }, this.fileUpdateInterval);
  }

  async updateWSSubscription(): Promise<void> {
    const [stockSymbols, cryptoPairs] = await this.allPairs();

    this.polygonIOStockPriceService.subscribe(...stockSymbols);
    this.polygonIOCryptoPriceService.subscribe(...cryptoPairs);
  }

  async allPairs(): Promise<[string[], Pair[]]> {
    return PolygonIOPriceInitializer.allPairs(
      this.settings.feedsFile,
      this.settings.feedsOnChain,
      this.settings.deviationTrigger.feedsFile,
    );
  }

  static async allPairs(...files: string[]): Promise<[string[], Pair[]]> {
    const feeds = await Promise.all(files.map(loadFeeds));

    const inputs = feeds
      .map((feed) => Object.values(feed))
      .flat(1)
      .map((value) => value.inputs)
      .flat();

    const stockSymbols = inputs
      .filter(({fetcher}) => [FetcherName.PolygonIOPrice, FetcherName.PolygonIOStockPrice].includes(fetcher.name))
      .map(({fetcher}) => fetcher.params)
      // eslint-disable-next-line
      .map(({sym}: any) => sym);

    const cryptoPairs = inputs
      .filter(({fetcher}) => fetcher.name === FetcherName.PolygonIOCryptoPrice)
      .map(({fetcher}) => fetcher.params)
      // eslint-disable-next-line
      .map(({fsym, tsym}: any) => ({fsym, tsym}));

    return [stockSymbols, cryptoPairs];
  }
}

export default PolygonIOPriceInitializer;
