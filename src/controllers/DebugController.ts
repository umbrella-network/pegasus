import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';
import {NextFunction} from 'express-serve-static-core';
import sort from 'fast-sort';

import Settings from '../types/Settings.js';
import TimeService from '../services/TimeService.js';
import PolygonIOCryptoPriceSubscriptionService from '../services/fetchers/common/PolygonIOCryptoPriceSubscriptionService.js';
import PolygonIOStockPriceService from '../services/PolygonIOStockPriceService.js';
import PolygonIOPriceInitializer from '../services/PolygonIOPriceInitializer.js';
import PriceRepository from '../repositories/PriceRepository.js';
import Feeds from '../types/Feed.js';
import loadFeeds from '../services/loadFeeds.js';
import FeedProcessor from '../services/FeedProcessor.js';

@injectable()
class DebugController {
  router: express.Router;
  settings!: Settings;

  @inject(TimeService) timeService!: TimeService;
  @inject(PolygonIOCryptoPriceSubscriptionService) polygonIOCryptoPriceService!: PolygonIOCryptoPriceSubscriptionService;
  @inject(PolygonIOStockPriceService) polygonIOStockPriceService!: PolygonIOStockPriceService;
  @inject(PolygonIOPriceInitializer) polygonIOPriceInitializer!: PolygonIOPriceInitializer;
  @inject(PriceRepository) priceRepository!: PriceRepository;
  @inject(FeedProcessor) feedProcessor!: FeedProcessor;

  constructor(@inject('Settings') settings: Settings) {
    this.router = express
      .Router()
      .get('/price-aggregator/polygon/crypto/prices/:fsym/:tsym', this.polygonCryptoPrices)
      .get('/price-aggregator/polygon/crypto/latest', this.polygonIOCryptoLatest)
      .get('/price-aggregator/polygon/stock/prices/:sym', this.polygonStockPrices)
      .get('/price-aggregator/polygon/stock/latest', this.polygonIOStockLatest)
      .get('/feeds', this.extractAuthorizationToken, this.feeds);

    this.settings = settings;
  }

  polygonStockPrices = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {sym} = request.params as {sym: string};

    try {
      response.send(await this.polygonIOStockPriceService.allPrices(sym));
    } catch (err) {
      next(err);
    }
  };

  polygonCryptoPrices = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {fsym, tsym} = request.params as {fsym: string; tsym: string};

    try {
      response.send(await this.polygonIOCryptoPriceService.allPrices({symbol: fsym, tsym}));
    } catch (err) {
      next(err);
    }
  };

  polygonIOCryptoLatest = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {beforeTimestamp = '0', orderBy = 'timestamp'} = request.query as unknown as {
      beforeTimestamp: string;
      orderBy: string;
    };

    try {
      const [, pairs] = await this.polygonIOPriceInitializer.allPairs();

      response.send(
        sort(
          await this.polygonIOCryptoPriceService.latestPrices(
            pairs,
            parseInt(beforeTimestamp, 10) || this.timeService.apply(),
          ),
          // eslint-disable-next-line
        ).asc((item: any) => item[orderBy]),
      );
    } catch (err) {
      next(err);
    }
  };

  polygonIOStockLatest = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {beforeTimestamp = '0', orderBy = 'timestamp'} = request.query as unknown as {
      beforeTimestamp: string;
      orderBy: string;
    };

    try {
      const [symbols] = await this.polygonIOPriceInitializer.allPairs();

      response.send(
        sort(
          await this.polygonIOStockPriceService.latestPrices(
            symbols,
            parseInt(beforeTimestamp, 10) || this.timeService.apply(),
          ),
          // eslint-disable-next-line
        ).asc((item: any) => item[orderBy]),
      );
    } catch (err) {
      next(err);
    }
  };

  feeds = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const dataTimestamp = request.params.timestamp
      ? parseInt(request.params.timestamp, 10)
      : Math.floor(Date.now() / 1000);

    try {
      let fetchFeedsMs = Date.now();

      const feeds: Feeds[] = await Promise.all(
        [this.settings.feedsOnChain, this.settings.feedsFile, this.settings.deviationTrigger.feedsFile].map(
          (fileName) => loadFeeds(fileName),
        ),
      );

      fetchFeedsMs = Date.now() - fetchFeedsMs;

      let processFeedsMs = Date.now();
      const [firstClassLeaves, leaves] = await this.feedProcessor.apply(dataTimestamp, ...feeds);
      processFeedsMs = Date.now() - processFeedsMs;

      response.send({
        firstClassLeaves,
        leaves,
        dataTimestamp,
        fetchFeedsMs,
        processFeedsMs,
      });
    } catch (err) {
      next(err);
    }
  };

  extractAuthorizationToken = (request: Request, response: Response, next: NextFunction): void => {
    const bearerHeader = request.headers.authorization;

    if (bearerHeader) {
      const bearer = bearerHeader.split(' ')[1];
      if (bearer === this.settings.api.debug.apiKey) {
        next();
        return;
      }
    }

    response.sendStatus(403);
  };
}

export default DebugController;
