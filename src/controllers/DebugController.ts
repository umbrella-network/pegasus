import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';
import {NextFunction} from 'express-serve-static-core';

import Settings from '../types/Settings';
import Helper from '../services/Helper';

@injectable()
class DebugController {
  router: express.Router;
  helper!: Helper;
  settings!: Settings;

  constructor(@inject('Settings') settings: Settings, @inject(Helper) helper: Helper) {
    this.router = express
      .Router()
      .get('/price-aggregator/latest', this.latest)
      .get('/price-aggregator/prices/:fsym/:tsym', this.prices);
    this.helper = helper;
    this.settings = settings;
  }

  prices = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {fsym, tsym}: any = request.params;

    try {
      response.send(await this.helper.priceAggregatorAllPrices(fsym, tsym));
    } catch (err) {
      next(err);
    }
  };

  latest = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {beforeTimestamp, orderBy = 'timestamp'}: any = request.query;

    try {
      response.send(
        await this.helper.orderedPriceAggregatorContent(beforeTimestamp && parseInt(beforeTimestamp, 10), orderBy),
      );
    } catch (err) {
      next(err);
    }
  };
}

export default DebugController;
