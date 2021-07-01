import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import Settings from '../types/Settings';
import {loadFeeds} from '@umb-network/toolbox';
import PolygonIOCryptoPriceService from './PolygonIOCryptoPriceService';
import PolygonIOStockPriceService from './PolygonIOStockPriceService';
import {Pair} from '../types/Feed';

@injectable()
class PolygonIOPriceInitializer {
  @inject(PolygonIOCryptoPriceService) polygonIOCryptoPriceService!: PolygonIOCryptoPriceService;
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
    const [stockSymbols, cryptoPairs] = await PolygonIOPriceInitializer.allSymbols(
      this.settings.feedsFile,
      this.settings.feedsOnChain,
    );

    this.polygonIOStockPriceService.subscribe(...stockSymbols);
    this.polygonIOCryptoPriceService.subscribe(...cryptoPairs);
  }

  static async allSymbols(...files: string[]): Promise<[string[], Pair[]]> {
    const feeds = await Promise.all(files.map(loadFeeds));

    const inputs = feeds
      .map((feed) => Object.values(feed))
      .flat(1)
      .map((value) => value.inputs)
      .flat();

    const stockSymbols = inputs
      .filter(({fetcher}) => fetcher.name === 'PolygonIOPrice' || fetcher.name === 'PolygonIOStockPrice')
      .map(({fetcher}) => fetcher.params)
      .map(({sym}: any) => sym);

    const cryptoPairs = inputs
      .filter(({fetcher}) => fetcher.name === 'PolygonIOCryptoPrice')
      .map(({fetcher}) => fetcher.params)
      .map(({fsym, tsym}: any) => ({fsym, tsym}));

    return [stockSymbols, cryptoPairs];
  }
}

export default PolygonIOPriceInitializer;
