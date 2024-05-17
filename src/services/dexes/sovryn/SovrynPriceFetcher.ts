import {PricesResponse, PairRequest, SovrynHelperBase} from './SovrynFetcherHelper.js';
import {FeedFetcherInterface} from 'src/types/fetchers.js';

export class SovrynPriceFetcher implements FeedFetcherInterface {
  sovrynConnection!: SovrynHelperBase;

  constructor(sovrynConnection: SovrynHelperBase) {
    this.sovrynConnection = sovrynConnection;
  }

  async getPrices(pairs: PairRequest[]): Promise<PricesResponse> {
    const prices = await this.sovrynConnection.getPrices(pairs);
    return prices;
  }

  async apply(pairs: PairRequest[]): Promise<number[]> {
    const prices = this.getPrices(pairs);
    return (await prices).prices.map((price) => price.price.toNumber());
  }
}
