import {inject, injectable} from 'inversify';

import CryptoCompareWSClient from '../ws/CryptoCompareWSClient.js';
import {PairWithFreshness} from '../../types/Feed.js';
import {FeedBaseQuote, FeedFetcherInterface} from 'src/types/fetchers.js';

@injectable()
class CryptoComparePriceWSFetcher implements FeedFetcherInterface {
  @inject(CryptoCompareWSClient) cryptoCompareWSClient!: CryptoCompareWSClient;

  async apply(params: PairWithFreshness & FeedBaseQuote, timestamp: number): Promise<number> {
    const price = await this.cryptoCompareWSClient.getLatestPrice(params, timestamp);

    if (price !== null) {
      return price;
    }

    throw new Error(`[CryptoComparePriceWSFetcher] NO recent price for ${params.fsym}-${params.tsym}`);
  }
}

export default CryptoComparePriceWSFetcher;
