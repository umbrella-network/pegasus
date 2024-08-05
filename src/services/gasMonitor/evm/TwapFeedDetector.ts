import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ChainsIds} from '../../../types/ChainsIds.js';
import {FeedRepository} from '../../../repositories/FeedRepository.js';
import {FetcherName} from 'src/types/fetchers.js';

@injectable()
export class TwapFeedDetector {
  @inject('Logger') logger!: Logger;
  @inject(FeedRepository) feedRepository!: FeedRepository;

  async apply(chainId: ChainsIds): Promise<boolean> {
    const feeds = await this.feedRepository.getDeviationTriggerFeeds([]);

    const enabled = !!Object.keys(feeds).find((key) => {
      return !!feeds[key].inputs.find((keyInput) => {
        const forChain = keyInput.fetcher.params
          ? (keyInput.fetcher.params as unknown as {chainId?: string}).chainId
          : undefined;

        return keyInput.fetcher.name === FetcherName.TWAPGasPrice && forChain == chainId;
      });
    });

    this.logger.debug(`[${chainId}] twap monitor ${enabled ? 'ON' : 'off'}`);
    return enabled;
  }
}
