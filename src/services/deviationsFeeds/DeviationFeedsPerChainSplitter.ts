import {DeviationFeeds} from '../../types/DeviationFeeds';

export class DeviationFeedsPerChainSplitter {
  static apply(feeds: DeviationFeeds): Record<string, string[]> {
    const keys = Object.keys(feeds);
    const result: Record<string, string[]> = {};

    keys.forEach((key) => {
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
