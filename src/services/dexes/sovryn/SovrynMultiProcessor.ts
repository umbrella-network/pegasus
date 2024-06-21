import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {SovrynPriceFetcher, PairRequest} from './SovrynPriceFetcher.js';
import {FeedFetcherInterface, FetcherName} from '../../../types/fetchers.js';
import {FeedFetcher} from '../../../types/Feed.js';
import {PriceDataRepository, PriceValueType} from '../../../repositories/PriceDataRepository.js';
import TimeService from '../../../services/TimeService.js';
import {PriceDataPayload} from '../../../repositories/PriceDataRepository.js';
import FeedChecker from '../../FeedChecker.js';

@injectable()
export default class SovrynMultiProcessor implements FeedFetcherInterface {
  @inject(SovrynPriceFetcher) sovrynFetcher!: SovrynPriceFetcher;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject(FeedChecker) private feedChecker!: FeedChecker;
  @inject('Logger') private logger!: Logger;

  static fetcherSource = '';

  async apply(feedFetchers: FeedFetcher[]): Promise<(number | undefined)[]> {
    const request = this.createRequest(feedFetchers);
    const prices = await this.sovrynFetcher.apply(request);

    const payloads: PriceDataPayload[] = [];

    for (const [ix, price] of prices.entries()) {
      try {
        const result = this.feedChecker.getBaseAndQuote(feedFetchers[ix].symbol);

        if (result.length === 2) {
          const [feedBase, feedQuote] = result;

          if (price) {
            payloads.push({
              fetcher: FetcherName.SOVRYN_PRICE,
              value: price.toString(),
              valueType: PriceValueType.Price,
              timestamp: this.timeService.apply(), // prices coming from SovrynFetcher don't contain any timestamp
              feedBase,
              feedQuote,
              fetcherSource: SovrynMultiProcessor.fetcherSource,
            });
          }
        }
      } catch (error) {
        this.logger.error('[SovrynPriceFetcher] failed to get price for pairs.', error);
      }
    }

    await this.priceDataRepository.savePrices(payloads);

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
