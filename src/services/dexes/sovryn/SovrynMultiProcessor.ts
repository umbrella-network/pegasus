import {inject, injectable} from 'inversify';

import {FeedFetcher} from '../../../types/Feed.js';
import {FeedFetcherInterface} from '../../../types/fetchers.js';
import {SovrynPriceFetcher, PairRequest} from './SovrynPriceFetcher.js';

@injectable()
export default class SovrynMultiProcessor implements FeedFetcherInterface {
  @inject(SovrynPriceFetcher) sovrynFetcher!: SovrynPriceFetcher;

  async apply(feedFetchers: FeedFetcher[]): Promise<(number | undefined)[]> {
    const request = this.createRequest(feedFetchers);
    const response = await this.sovrynFetcher.apply(request);
    return response;
  }

  private createRequest(feedInputs: FeedFetcher[]): PairRequest[] {
    const request: PairRequest[] = [];

    feedInputs.forEach((fetcher) => {
      if (!fetcher.name.includes('SovrynPriceFetcher')) return;

      const request_ = fetcher.params as PairRequest;

      request.push(request_);
    });

    return request;
  }
}
