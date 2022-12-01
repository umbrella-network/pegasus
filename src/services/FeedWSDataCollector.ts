import {inject, injectable} from 'inversify';
import {Logger} from 'winston';
import newrelic from 'newrelic';

import CryptoCompareWSInitializer from './CryptoCompareWSInitializer';
import PolygonIOPriceInitializer from './PolygonIOPriceInitializer';

@injectable()
export class FeedWSDataCollector {
  @inject('Logger') logger!: Logger;
  @inject(CryptoCompareWSInitializer) cryptoCompareWSInitializer!: CryptoCompareWSInitializer;
  @inject(PolygonIOPriceInitializer) polygonIOPriceInitializer!: PolygonIOPriceInitializer;

  async apply(): Promise<void> {
    this.polygonIOPriceInitializer.apply().catch((err: Error) => {
      newrelic.noticeError(err);
      this.logger.error(err);
      process.exit(1);
    });

    this.cryptoCompareWSInitializer.apply().catch((err: Error) => {
      newrelic.noticeError(err);
      this.logger.error(err);
      process.exit(1);
    });
  }
}
