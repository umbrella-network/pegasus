import {inject, injectable} from 'inversify';
import express, {Request, Response} from 'express';
import {NextFunction} from 'express-serve-static-core';
import sort from 'fast-sort';

import Settings from '../types/Settings';
import TimeService from '../services/TimeService';
import PolygonIOCryptoPriceService from '../services/PolygonIOCryptoPriceService';
import PolygonIOStockPriceService from '../services/PolygonIOStockPriceService';
import CryptoCompareWSClient from '../services/ws/CryptoCompareWSClient';
import PolygonIOPriceInitializer from '../services/PolygonIOPriceInitializer';
import CryptoCompareWSInitializer from '../services/CryptoCompareWSInitializer';
import KaikoPriceStreamClient from '../stream/KaikoPriceStreamClient';
import KaikoPriceStreamInitializer from '../services/KaikoPriceStreamInitializer';
import PairRepository from '../repositories/PairRepository';
import PriceRepository from '../repositories/PriceRepository';

@injectable()
class DebugController {
  router: express.Router;
  settings!: Settings;

  @inject(TimeService) timeService!: TimeService;
  @inject(PolygonIOCryptoPriceService) polygonIOCryptoPriceService!: PolygonIOCryptoPriceService;
  @inject(PolygonIOStockPriceService) polygonIOStockPriceService!: PolygonIOStockPriceService;
  @inject(CryptoCompareWSClient) cryptoCompareWSClient!: CryptoCompareWSClient;
  @inject(PolygonIOPriceInitializer) polygonIOPriceInitializer!: PolygonIOPriceInitializer;
  @inject(CryptoCompareWSInitializer) cryptoCompareWSInitializer!: CryptoCompareWSInitializer;
  @inject(KaikoPriceStreamClient) kaikoPriceStreamClient!: KaikoPriceStreamClient;
  @inject(KaikoPriceStreamInitializer) kaikoPriceStreamInitializer!: KaikoPriceStreamInitializer;
  @inject(PairRepository) pairRepository!: PairRepository;
  @inject(PriceRepository) priceRepository!: PriceRepository;

  constructor(@inject('Settings') settings: Settings) {
    this.router = express
      .Router()
      .get('/price-aggregator/cryptocompare/prices/:fsym/:tsym', this.cryptoComparePrices)
      .get('/price-aggregator/cryptocompare/latest', this.cryptoCompareLatest)
      .get('/price-aggregator/polygon/crypto/prices/:fsym/:tsym', this.polygonCryptoPrices)
      .get('/price-aggregator/polygon/crypto/latest', this.polygonIOCryptoLatest)
      .get('/price-aggregator/polygon/stock/prices/:sym', this.polygonStockPrices)
      .get('/price-aggregator/polygon/stock/latest', this.polygonIOStockLatest)
      .get('/price-aggregator/kaiko/latest', this.kaikoPriceLatest)
      .get('/price-aggregator/kaiko/prices/:fsym/:tsym', this.kaikoPrices);

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
      const pairs = await this.cryptoCompareWSInitializer.allPairs();

      response.send(
        sort(
          await this.cryptoCompareWSClient.latestPrices(
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

  kaikoPriceLatest = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {beforeTimestamp = '0', orderBy = 'timestamp'} = request.query as unknown as {
      beforeTimestamp: string;
      orderBy: string;
    };

    try {
      const pairs = await this.pairRepository.getPairsByFetcher('KaikoPriceStream');

      response.send(
        sort(
          await this.priceRepository.getLatestPrices(
            KaikoPriceStreamClient.Prefix,
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

  kaikoPrices = async (request: Request, response: Response, next: NextFunction): Promise<void> => {
    const {fsym, tsym} = request.params as {fsym: string; tsym: string};

    try {
      response.send(await this.priceRepository.getAllPrices(KaikoPriceStreamClient.Prefix, {fsym, tsym}));
    } catch (err) {
      next(err);
    }
  };
}

export default DebugController;
