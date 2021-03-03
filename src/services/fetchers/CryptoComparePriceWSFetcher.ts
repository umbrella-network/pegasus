import {inject, injectable} from 'inversify';
import CryptoCompareWSClient from '../ws/CryptoCompareWSClient';
import {Pair} from '../../types/Feed';

@injectable()
class CryptoComparePriceWSFetcher {
  @inject(CryptoCompareWSClient) cryptoCompareWSClient!: CryptoCompareWSClient;

  async apply(params: Pair): Promise<number> {
    const price = this.cryptoCompareWSClient.getLatestPrice(params);
    if (!price) {
      throw new Error(`NO price for ${params.fsym}-${params.tsym}`);
    }
    return this.cryptoCompareWSClient.getLatestPrice(params);
  }
}

export default CryptoComparePriceWSFetcher;
