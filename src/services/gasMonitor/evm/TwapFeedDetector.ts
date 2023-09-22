import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ChainsIds} from "../../../types/ChainsIds";
import {FeedRepository} from "../../../repositories/FeedRepository";

@injectable()
export class TwapFeedDetector {
  @inject('Logger') logger!: Logger;
  @inject(FeedRepository) feedRepository!: FeedRepository;

  async apply(chainId: ChainsIds): Promise<boolean> {
    const feeds = await this.feedRepository.getDeviationTriggerFeeds([]);

    const enabled = !!Object.keys(feeds).find(key => {
      return !!feeds[key].inputs.find(keyInput => {
        const forChain = keyInput.fetcher.params
          ? (keyInput.fetcher.params as unknown as {chainId?: string}).chainId
          : undefined;

        return keyInput.fetcher.name == 'TWAPGasPrice' && forChain == chainId
      });
    });

    this.logger.debug(`[${chainId}] twap monitor ${enabled ? 'ON' : 'off'}`);
    return enabled;
  }
}
