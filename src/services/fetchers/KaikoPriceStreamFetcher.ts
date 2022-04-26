import {inject, injectable} from 'inversify';

import KaikoPriceStreamClient from '../../stream/KaikoPriceStreamClient';
import {PairWithFreshness} from '../../types/Feed';
import {PriceRepository} from '../../repositories/PriceRepository';

@injectable()
class KaikoPriceStreamFetcher {
  @inject(PriceRepository) priceRepository!: PriceRepository;

  static readonly DefaultFreshness = 3600;

  async apply(
    pair: PairWithFreshness,
    timestamp: number,
    freshness = KaikoPriceStreamFetcher.DefaultFreshness,
  ): Promise<number> {
    const afterTimestamp = timestamp - freshness;
    const price = await this.priceRepository.getLatestPrice({
      source: KaikoPriceStreamClient.Source,
      symbol: `${pair.fsym}-${pair.tsym}`,
      timestamp: {
        from: new Date(afterTimestamp * 1000),
        to: new Date(timestamp * 1000),
      },
    });

    if (price) {
      return price;
    }

    throw new Error(`NO recent price for ${pair.fsym}-${pair.tsym}`);
  }
}

export default KaikoPriceStreamFetcher;
