import { Container, interfaces } from 'inversify';
import { Provider } from '@ethersproject/providers';
import ChainContract from '../contracts/ChainContract';
import getEthers from '../functions/getEthers';

class Application {
  private static _instance: Application;
  private container: Container;

  private constructor() {
    this.container = new Container({ autoBindInjectable: true });
    this.container.bind<Provider>(Provider).toConstantValue(getEthers());
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
