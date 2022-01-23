import {inject, injectable} from 'inversify';
import {LoopAgent} from './LoopAgent';
import ApplicationUpdateService from '../services/ApplicationUpdateService';

@injectable()
export class ApplicationUpdateAgent extends LoopAgent {
  @inject(ApplicationUpdateService) applicationUpdateService!: ApplicationUpdateService;

  interval = 10*60*1000; // TODO: make this configurable
  counter = 0;

  async execute(): Promise<void> {
    if (this.counter != 0) {
      await this.applicationUpdateService.startUpdate();
    }

    if (this.counter == Number.MAX_SAFE_INTEGER) {
      this.counter = 1;
    } else {
      this.counter += 1;
    }
  }
}
