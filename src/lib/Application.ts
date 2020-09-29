import { Container, interfaces } from 'inversify';

class Application {
  private static _instance: Application;

  private container: Container;

  private constructor() {
    this.container = new Container({ autoBindInjectable: true });
  }

  public static get instance(): Application {
    if (!this._instance) this._instance = new Application();

    return this._instance;
  }

  public static get<T>(serviceIdentifier: interfaces.ServiceIdentifier<T>): T {
    return Application.instance.container.get(serviceIdentifier);
  }
}

export default Application;
