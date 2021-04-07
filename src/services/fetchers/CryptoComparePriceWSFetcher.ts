import {inject, injectable} from 'inversify';

import CryptoCompareWSClient from '../ws/CryptoCompareWSClient';
import {Pair} from '../../types/Feed';

@injectable()
class CryptoComparePriceWSFetcher {
  @inject(CryptoCompareWSClient) cryptoCompareWSClient!: CryptoCompareWSClient;

  async apply(params: Pair, timestamp: number): Promise<number> {
    const price = await this.cryptoCompareWSClient.getLatestPrice(params, timestamp);
    if (price !== null) {
      return price;
    }

    throw new Error(`NO price for ${params.fsym}-${params.tsym}`);
  }
}

export default CryptoComparePriceWSFetcher;
