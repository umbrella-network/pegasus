import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {SovrynPriceFetcher, PairRequest} from './SovrynPriceFetcher.js';
import {FeedMultiProcessorInterface, FetcherName, NumberOrUndefined} from '../../../types/fetchers.js';
import {FeedFetcher} from '../../../types/Feed.js';
import {PriceDataRepository, PriceValueType} from '../../../repositories/PriceDataRepository.js';
import {PriceDataPayload} from '../../../repositories/PriceDataRepository.js';
import FeedSymbolChecker from '../../FeedSymbolChecker.js';

@injectable()
export default class SovrynMultiProcessor implements FeedMultiProcessorInterface {
  @inject(SovrynPriceFetcher) sovrynFetcher!: SovrynPriceFetcher;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(FeedSymbolChecker) private feedSymbolChecker!: FeedSymbolChecker;
  @inject('Logger') private logger!: Logger;

  static fetcherSource = '';

  async apply(feedFetchers: FeedFetcher[]): Promise<NumberOrUndefined[]> {
    const request = this.createRequest(feedFetchers);
    this.logger.debug(`[SovrynMultiProcessor] started, ${request.length} feeds to request.`);

    const priceResponse = await this.sovrynFetcher.apply(request);
    const prices = priceResponse.prices;

    const payloads: PriceDataPayload[] = [];

    for (const [ix, price] of prices.entries()) {
      if (!price) {
        this.logger.debug(`[SovrynMultiProcessor] !price, ${ix} ${price}`);
        continue;
      }

      const result = this.feedSymbolChecker.apply(feedFetchers[ix].symbol);

      if (!result) {
        this.logger.debug(`[SovrynMultiProcessor] !result, ${ix} ${price}`);
        continue;
      }

      const [feedBase, feedQuote] = result;

      payloads.push({
        fetcher: FetcherName.SOVRYN_PRICE,
        value: price.toString(),
        valueType: PriceValueType.Price,
        timestamp: priceResponse.timestamp,
        feedBase,
        feedQuote,
        fetcherSource: SovrynMultiProcessor.fetcherSource,
      });

      this.logger.debug(`[SovrynMultiProcessor] payloads.push(${feedBase}-${feedQuote}: ${price.toString()})`);
    }

    await this.priceDataRepository.savePrices(payloads);

    return this.sortOutput(feedFetchers, prices);
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

  private sortOutput(feedFetchers: FeedFetcher[], prices: NumberOrUndefined[]): number[] {
    const result: number[] = [];
    result.length = feedFetchers.length;

    let priceIx = 0;

    feedFetchers.forEach((fetcher, index) => {
      if (!fetcher.name.includes(FetcherName.SOVRYN_PRICE)) return;

      const price = prices[priceIx];

      if (price !== undefined) {
        result[index] = price;
        priceIx++;
      }
    });

    return result;
  }
}
