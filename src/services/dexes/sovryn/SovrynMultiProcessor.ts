import {inject, injectable} from 'inversify';

import {SovrynPriceFetcher, PairRequest} from './SovrynPriceFetcher.js';
import {FeedFetcherInterface, FetcherName} from '../../../types/fetchers.js';
import {FeedFetcher} from '../../../types/Feed.js';
import {PriceDataRepository} from '../../../repositories/PriceDataRepository.js';

@injectable()
export default class SovrynMultiProcessor implements FeedFetcherInterface {
  @inject(SovrynPriceFetcher) sovrynFetcher!: SovrynPriceFetcher;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;

  async apply(feedFetchers: FeedFetcher[]): Promise<(number | undefined)[]> {
    const request = this.createRequest(feedFetchers);
    const prices = await this.sovrynFetcher.apply(request);

    const symbolToBaseAndQuote = (symbol: string) => {
      const symbols = symbol.split('-');
      return symbols.length != 2 ? ['not-found', 'not-found'] : symbols;
    };

    prices.forEach((price, ix) => {
      const [feedBase, feedQuote] = symbolToBaseAndQuote(feedFetchers[ix].symbol || '-');

      if (price) {
        this.priceDataRepository.savePrice({
          fetcher: FetcherName.SOVRYN_PRICE,
          value: price.toString(),
          valueType: 'string',
          timestamp: Date.now(), // prices coming from SovrynFetcher don't contain any timestamp
          feedBase,
          feedQuote,
          fetcherSource: 'Sovryn Protocol',
        });
      }
    });

    return prices;
  }

  private createRequest(feedInputs: FeedFetcher[]): PairRequest[] {
    const request: PairRequest[] = [];

    feedInputs.forEach((fetcher) => {
      if (!fetcher.name.includes(FetcherName.SOVRYN_PRICE)) return;

      const request_ = fetcher.params as PairRequest;

      request.push(request_);
    });

    return request;
  }
}
