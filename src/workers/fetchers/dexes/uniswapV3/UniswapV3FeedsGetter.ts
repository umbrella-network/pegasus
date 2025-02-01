import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import TimeService from '../../../../services/TimeService.js';
import {FeedsType} from '../../../../types/Feed.js';
import {FeedDataService} from '../../../../services/FeedDataService.js';
import {ChainsIds} from '../../../../types/ChainsIds.js';
import {FetcherName} from '../../../../types/fetchers.js';
import {DeviationLeavesAndFeeds} from '../../../../types/DeviationFeeds.js';
import {DexProtocolName} from '../../../../types/Dexes.js';
import {UniswapV3Param} from './interfaces.js';

@injectable()
export class UniswapV3FeedsGetter {
  @inject(FeedDataService) feedDataService!: FeedDataService;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') logger!: Logger;

  readonly protocol = DexProtocolName.UNISWAP_V3;
  readonly logPrefix = '[UniswapV3FeedsGetter]';

  async apply(chainId: ChainsIds): Promise<UniswapV3Param[]> {
    const feeds = await this.getFeeds(chainId);
    return this.feedDataService.getParamsByFetcherName<UniswapV3Param>(feeds, FetcherName.UniswapV3, chainId);
  }

  private async getFeeds(chainId: ChainsIds): Promise<DeviationLeavesAndFeeds> {
    const dataTimestamp = this.timeService.apply();
    const data = await this.feedDataService.apply(dataTimestamp, FeedsType.DEVIATION_TRIGGER);

    if (data.rejected) {
      this.logger.info(`${this.logPrefix}[${chainId}] rejected: ${data.rejected}`);
    }

    return data.feeds as DeviationLeavesAndFeeds;
  }
}
