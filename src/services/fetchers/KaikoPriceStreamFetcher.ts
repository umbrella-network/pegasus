import {inject, injectable} from 'inversify';

import KaikoPriceStreamClient from '../../stream/KaikoPriceStreamClient';
import {PairWithFreshness} from '../../types/Feed';

@injectable()
class KaikoPriceStreamFetcher {
  @inject(KaikoPriceStreamClient) kaikoPriceStreamClient!: KaikoPriceStreamClient;

  async apply(pair: PairWithFreshness, timestamp: number): Promise<number> {
    const price = await this.kaikoPriceStreamClient.getLatestPrice(pair, timestamp);

    if (price !== null) {
      return price;
    }

    throw new Error(`NO recent price for ${pair.fsym}-${pair.tsym}`);
  }
}

export default KaikoPriceStreamFetcher;
