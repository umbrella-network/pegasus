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
      .get('/price-aggregator/prices/:fsym/:tsym', this.prices)
      .get('/price-aggregator/prices/:sym', this.stockPrices);
    this.helper = helper;
    this.settings = settings;
  }

  prices = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {fsym, tsym} = request.params as {fsym: string; tsym: string};

    try {
      response.send(await this.helper.priceAggregatorAllPrices(fsym, tsym));
    } catch (err) {
      next(err);
    }
  };

  stockPrices = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {sym} = request.params as {sym: string};

    try {
      response.send(await this.helper.priceAggregatorStockPrices(sym));
    } catch (err) {
      next(err);
    }
  };

  latest = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {beforeTimestamp, orderBy} = request.query as unknown as {beforeTimestamp: string; orderBy: string};

    try {
      response.send(
        await this.helper.orderedPriceAggregatorContent(
          beforeTimestamp ? parseInt(beforeTimestamp, 10) : undefined,
          orderBy,
        ),
      );
    } catch (err) {
      next(err);
    }
  };
}

export default DebugController;
