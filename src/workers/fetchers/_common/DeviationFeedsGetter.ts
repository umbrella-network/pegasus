import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import TimeService from '../../../services/TimeService.js';
import {FeedsType} from '../../../types/Feed.js';
import {FeedDataService} from '../../../services/FeedDataService.js';
import {ChainsIds} from '../../../types/ChainsIds.js';
import {FetcherName} from '../../../types/fetchers.js';
import {DeviationLeavesAndFeeds} from '../../../types/DeviationFeeds.js';

@injectable()
export class DeviationFeedsGetter {
  @inject(FeedDataService) feedDataService!: FeedDataService;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') logger!: Logger;

  readonly logPrefix = '[UniswapV3FeedsGetter]';

  async apply<T>(fetcher: FetcherName): Promise<T[]> {
    const feeds = await this.getFeeds();
    return this.feedDataService.getParamsByFetcherName<T>(feeds, fetcher);
  }

  private async getFeeds(): Promise<DeviationLeavesAndFeeds> {
    const dataTimestamp = this.timeService.apply();
    const data = await this.feedDataService.apply(dataTimestamp, FeedsType.DEVIATION_TRIGGER);

    if (data.rejected) {
      this.logger.info(`${this.logPrefix} rejected: ${data.rejected}`);
    }

    return data.feeds as DeviationLeavesAndFeeds;
  }
}
