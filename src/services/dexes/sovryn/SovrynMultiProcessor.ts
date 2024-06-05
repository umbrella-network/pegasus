import {inject, injectable} from 'inversify';

import {SovrynPriceFetcher, PairRequest} from './SovrynPriceFetcher.js';
import {FeedFetcherInterface, FetcherName} from '../../../types/fetchers.js';
import {FeedFetcher} from '../../../types/Feed.js';

@injectable()
export default class SovrynMultiProcessor implements FeedFetcherInterface {
  @inject(SovrynPriceFetcher) sovrynFetcher!: SovrynPriceFetcher;

  async apply(feedFetchers: FeedFetcher[]): Promise<(number | undefined)[]> {
    const request = this.createRequest(feedFetchers);
    return await this.sovrynFetcher.apply(request);
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
