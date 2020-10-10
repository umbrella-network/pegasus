import { Container, interfaces } from 'inversify';
import Web3 from 'web3';
import getWeb3 from '../functions/getWeb3';
import ChainContract from '../contracts/ChainContract';

class Application {
  private static _instance: Application;
  private container: Container;

  private constructor() {
    this.container = new Container({ autoBindInjectable: true });
    this.container.bind<Web3>(Web3).toConstantValue(getWeb3());
    this.container.bind<ChainContract>(ChainContract).toSelf().inSingletonScope();
  }

  public static get instance(): Application {
    return this._instance ||= new Application();
  }

  public static get<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): T {
    return Application.instance.container.get(serviceIdentifier);
  }
}

export default Application;
