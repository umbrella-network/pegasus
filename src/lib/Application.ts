import {Container, interfaces} from 'inversify';
import {getContainer} from './getContainer.js';

class Application {
  private static _instance: Application;
  private container: Container;

  private constructor() {
    this.container = getContainer();
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
