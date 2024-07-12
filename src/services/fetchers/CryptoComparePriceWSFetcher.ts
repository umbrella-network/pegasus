import {inject, injectable} from 'inversify';

import CryptoCompareWSClient from '../ws/CryptoCompareWSClient.js';
import {PairWithFreshness} from '../../types/Feed.js';
import {FeedFetcherInterface, FeedFetcherOptions} from 'src/types/fetchers.js';

@injectable()
class CryptoComparePriceWSFetcher implements FeedFetcherInterface {
  @inject(CryptoCompareWSClient) cryptoCompareWSClient!: CryptoCompareWSClient;

  async apply(params: PairWithFreshness, options: FeedFetcherOptions): Promise<number> {
    const {timestamp} = options;

    if (!timestamp || timestamp <= 0) throw new Error(`invalid timestamp value: ${timestamp}`);

    const price = await this.cryptoCompareWSClient.getLatestPrice(params, timestamp);

    if (price !== null) {
      return price;
    }

    throw new Error(`[CryptoComparePriceWSFetcher] NO recent price for ${params.fsym}-${params.tsym}`);
  }
}

export default CryptoComparePriceWSFetcher;
