import {inject, injectable} from 'inversify';

import CryptoCompareWSClient from '../ws/CryptoCompareWSClient.js';
import {PairWithFreshness} from '../../types/Feed.js';

@injectable()
class CryptoComparePriceWSFetcher {
  @inject(CryptoCompareWSClient) cryptoCompareWSClient!: CryptoCompareWSClient;

  async apply(pair: PairWithFreshness, timestamp: number): Promise<number> {
    const price = await this.cryptoCompareWSClient.getLatestPrice(pair, timestamp);

    if (price !== null) {
      return price;
    }

    throw new Error(`[CryptoComparePriceWSFetcher] NO recent price for ${pair.fsym}-${pair.tsym}`);
  }
}

export default CryptoComparePriceWSFetcher;
