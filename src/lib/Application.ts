import { Container, interfaces } from 'inversify';
import { Logger } from 'winston';
import settings from '../config/settings';
import logger from './logger';
import Settings from '../types/Settings';
import BlockchainService from '../services/BlockchainService';
import ChainContract from '../contracts/ChainContract';

class Application {
  private static _instance: Application;
  private container: Container;

  private constructor() {
    this.container = new Container({ autoBindInjectable: true });
    this.container.bind<Settings>('Settings').toConstantValue(settings);
    this.container.bind<Logger>('Logger').toConstantValue(logger);
    this.container.bind<ChainContract>(ChainContract).toSelf().inSingletonScope();
    this.container.bind<BlockchainService>(BlockchainService).toSelf().inSingletonScope();
  }

  public static get instance(): Application {
    return this._instance ||= new Application();
  }

  public static get<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): T {
    return Application.instance.container.get(serviceIdentifier);
  }
}

export default Application;
