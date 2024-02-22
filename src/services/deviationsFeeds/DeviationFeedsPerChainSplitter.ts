import {DeviationFeeds} from '../../types/DeviationFeeds.js';
import {ChainsId, FeedName} from '../../types/Feed';

export class DeviationFeedsPerChainSplitter {
  static apply(feeds: DeviationFeeds): Record<ChainsId, FeedName[]> {
    const keys: FeedName[] = Object.keys(feeds);
    const result: Record<ChainsId, FeedName[]> = {};

    keys.forEach((key: FeedName) => {
      feeds[key].chains.forEach((chainId) => {
        if (!result[chainId]) {
          result[chainId] = [];
        }

        result[chainId].push(key);
      });
    });

    return result;
  }
}
