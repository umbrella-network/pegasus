import {inject, injectable} from 'inversify';
import {LoopAgent} from './LoopAgent';
import ApplicationUpdateService from '../services/ApplicationUpdateService';
import Settings from '../types/Settings';

@injectable()
export class ApplicationUpdateAgent extends LoopAgent {
  @inject(ApplicationUpdateService) applicationUpdateService!: ApplicationUpdateService;

  counter = 0;

  constructor(@inject('Settings') settings: Settings) {
    super();
    this.interval = settings.application.autoUpdate.interval;
  }

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
