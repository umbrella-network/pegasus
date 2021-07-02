import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';
import {NextFunction} from 'express-serve-static-core';

import Settings from '../types/Settings';
import TimeService from '../services/TimeService';
import PolygonIOCryptoPriceService from '../services/PolygonIOCryptoPriceService';
import PolygonIOStockPriceService from '../services/PolygonIOStockPriceService';
import CryptoCompareWSClient from '../services/ws/CryptoCompareWSClient';
import sort from 'fast-sort';

@injectable()
class DebugController {
  router: express.Router;
  settings!: Settings;

  @inject(TimeService) timeService!: TimeService;
  @inject(PolygonIOCryptoPriceService) polygonIOCryptoPriceService!: PolygonIOCryptoPriceService;
  @inject(PolygonIOStockPriceService) polygonIOStockPriceService!: PolygonIOStockPriceService;
  @inject(CryptoCompareWSClient) cryptoCompareWSClient!: CryptoCompareWSClient;

  constructor(@inject('Settings') settings: Settings) {
    this.router = express
      .Router()
      .get('/price-aggregator/cryptocompare/prices/:fsym/:tsym', this.cryptoComparePrices)
      .get('/price-aggregator/cryptocompare/latest', this.cryptoCompareLatest)
      .get('/price-aggregator/polygon/crypto/prices/:fsym/:tsym', this.polygonCryptoPrices)
      .get('/price-aggregator/polygon/crypto/latest', this.polygonIOCryptoLatest)
      .get('/price-aggregator/polygon/stock/prices/:sym', this.polygonStockPrices)
      .get('/price-aggregator/polygon/stock/latest', this.polygonIOStockLatest);

    this.settings = settings;
  }

  cryptoComparePrices = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {fsym, tsym} = request.params as {fsym: string; tsym: string};

    try {
      response.send(await this.cryptoCompareWSClient.allPrices({fsym, tsym}));
    } catch (err) {
      next(err);
    }
  };

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
      response.send(await this.polygonIOCryptoPriceService.allPrices({fsym, tsym}));
    } catch (err) {
      next(err);
    }
  };

  cryptoCompareLatest = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {beforeTimestamp = '0', orderBy = 'timestamp'} = request.query as unknown as {
      beforeTimestamp: string;
      orderBy: string;
    };

    try {
      response.send(
        sort(
          await this.cryptoCompareWSClient.latestPrices(parseInt(beforeTimestamp, 10) || this.timeService.apply()),
          // eslint-disable-next-line
        ).asc((item: any) => item[orderBy]),
      );
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
      response.send(
        sort(
          await this.polygonIOCryptoPriceService.latestPrices(
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
      response.send(
        sort(
          await this.polygonIOStockPriceService.latestPrices(parseInt(beforeTimestamp, 10) || this.timeService.apply()),
          // eslint-disable-next-line
        ).asc((item: any) => item[orderBy]),
      );
    } catch (err) {
      next(err);
    }
  };
}

export default DebugController;
