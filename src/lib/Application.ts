import {Container, interfaces} from 'inversify';
import {Logger} from 'winston';
import settings from '../config/settings';
import logger from './logger';
import Settings from '../types/Settings';
import Blockchain from './Blockchain';
import ChainContract from '../contracts/ChainContract';
import CryptoCompareWSClient from '../services/ws/CryptoCompareWSClient';
import {Redis} from 'ioredis';
import {initRedis} from '../config/initRedis';
import {FeedFetcherRepository} from '../repositories/FeedFetcherRepository';
import PriceRepository from '../repositories/PriceRepository';
import PairRepository from '../repositories/PairRepository';
import {CalculatorRepository} from '../repositories/CalculatorRepository';
import {FeedRepository} from '../repositories/FeedRepository';

class Application {
  private static _instance: Application;
  private container: Container;

  private constructor() {
    this.container = new Container({autoBindInjectable: true});
    this.container.bind<Settings>('Settings').toConstantValue(settings);
    this.container.bind<Logger>('Logger').toConstantValue(logger);
    this.container.bind<ChainContract>(ChainContract).toSelf().inSingletonScope();
    this.container.bind<Blockchain>(Blockchain).toSelf().inSingletonScope();
    this.container.bind<CryptoCompareWSClient>(CryptoCompareWSClient).toSelf().inSingletonScope();
    this.container.bind(PriceRepository).toSelf().inSingletonScope();
    this.container.bind(PairRepository).toSelf().inSingletonScope();
    this.container.bind(FeedFetcherRepository).toSelf().inSingletonScope();
    this.container.bind(CalculatorRepository).toSelf().inSingletonScope();
    this.container.bind(FeedRepository).toSelf().inSingletonScope();

    this.container
      .bind<Redis>('Redis')
      .toDynamicValue((ctx) => initRedis(ctx.container.get('Settings')))
      .inSingletonScope();
  }

  public static get instance(): Application {
    if (this._instance) {
      return this._instance;
    }

    return (this._instance = new Application());
  }

  public static get<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): T {
    return Application.instance.container.get(serviceIdentifier);
  }
}

export default Application;
