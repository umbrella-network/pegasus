import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import Settings from '../types/Settings';
import {loadFeeds} from '@umb-network/toolbox';
import PolygonIOPriceService from './PolygonIOPriceService';

@injectable()
class PolygonIOPriceInitializer {
  @inject(PolygonIOPriceService) polygonIOPriceService!: PolygonIOPriceService;
  @inject('Settings') settings!: Settings;
  @inject('Logger') logger!: Logger;

  fileUpdateInterval = 60 * 1000;

  async apply(): Promise<void> {
    this.polygonIOPriceService.start();

    return this.subscribeWS();
  }

  async subscribeWS(): Promise<void> {
    await this.updateWSSubscription();

    setInterval(() => {
      this.updateWSSubscription().catch(this.logger.error);
    }, this.fileUpdateInterval);
  }

  async updateWSSubscription(): Promise<void> {
    const symbols = await PolygonIOPriceInitializer.allSymbols(this.settings.feedsFile, this.settings.feedsOnChain);

    this.polygonIOPriceService.subscribe(...symbols);
  }

  static async allSymbols(...files: string[]): Promise<string[]> {
    const feeds = await Promise.all(files.map(loadFeeds));

    return feeds
      .map((feed) => Object.values(feed))
      .flat(1)
      .map((value) => value.inputs)
      .flat()
      .filter(({fetcher}) => fetcher.name === 'PolygonIOPrice')
      .map(({fetcher}) => fetcher.params)
      .map(({sym}: any) => sym);
  }
}

export default PolygonIOPriceInitializer;
