import {injectable} from 'inversify';

@injectable()
export abstract class BasicAgent {
  abstract start(): Promise<void>;
}
