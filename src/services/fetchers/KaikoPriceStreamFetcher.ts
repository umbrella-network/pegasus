import {inject, injectable} from 'inversify';

import KaikoPriceStreamClient from '../../stream/KaikoPriceStreamClient';
import PriceRepository from '../../repositories/PriceRepository';
import {PairWithFreshness} from '../../types/Feed';

@injectable()
class KaikoPriceStreamFetcher {
  @inject(PriceRepository) priceRepository!: PriceRepository;

  async apply(pair: PairWithFreshness, timestamp: number): Promise<number> {
    const prefix = KaikoPriceStreamClient.Prefix;
    const price = await this.priceRepository.getLatestPrice(prefix, pair, timestamp);

    if (price !== null) {
      return price;
    }

    throw new Error(`NO recent price for ${pair.fsym}-${pair.tsym}`);
  }
}

export default KaikoPriceStreamFetcher;
