import {inject, injectable} from 'inversify';
import {LoopAgent} from './LoopAgent';
import {FeedDataCollector} from '../services/FeedDataCollector';
import Settings from '../types/Settings';

@injectable()
export class FeedAgent extends LoopAgent {
  @inject(FeedDataCollector) feedDataCollector!: FeedDataCollector;
  constructor(@inject('Settings') settings: Settings) {
    super();
    this.interval = settings.api.fetcherInterval;
  }

  async execute(): Promise<void> {
    await this.feedDataCollector.run();
  }
}
