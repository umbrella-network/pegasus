import {inject, injectable} from 'inversify';

import {ByBitSpotFetcher} from '../fetchers/index.js';
import {FeedFetcher} from '../../types/Feed.js';

import {NumberOrUndefined, FetcherName, FeedMultiProcessorInterface} from '../../types/fetchers.js';
import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import FeedSymbolChecker from '../FeedSymbolChecker.js';
import {InputParams} from '../fetchers/ByBitSpotFetcher.js';

@injectable()
export default class ByBitMultiProcessor implements FeedMultiProcessorInterface {
  @inject(ByBitSpotFetcher) byBitSpotFetcher!: ByBitSpotFetcher;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(FeedSymbolChecker) private feedSymbolChecker!: FeedSymbolChecker;
  @inject(TimeService) private timeService!: TimeService;

  static fetcherSource = '';

  async apply(feedFetchers: FeedFetcher[]): Promise<NumberOrUndefined[]> {
    const byBitInputs = feedFetchers.filter((fetcher) => fetcher.name === FetcherName.BY_BIT);
    const params = byBitInputs.map((fetcher) => fetcher.params as InputParams);
    const outputs = await this.byBitSpotFetcher.apply(params);

    const payloads: PriceDataPayload[] = [];

    for (const [ix, output] of outputs.entries()) {
      if (!output) continue;

      const result = this.feedSymbolChecker.apply(byBitInputs[ix].symbol);
      if (!result) continue;

      const [feedBase, feedQuote] = result;

      payloads.push({
        fetcher: FetcherName.BY_BIT,
        value: output.toString(),
        valueType: PriceValueType.Price,
        timestamp: this.timeService.apply(),
        feedBase,
        feedQuote,
        fetcherSource: ByBitMultiProcessor.fetcherSource,
      });
    }

    await this.priceDataRepository.savePrices(payloads);

    return this.sortOutput(feedFetchers, outputs.flat());
  }

  private sortOutput(feedFetchers: FeedFetcher[], prices: NumberOrUndefined[]): NumberOrUndefined[] {
    const result: NumberOrUndefined[] = [];
    result.length = feedFetchers.length;

    let priceIx = 0;

    feedFetchers.forEach((fetcher, index) => {
      if (fetcher.name == FetcherName.BY_BIT) {
        const price = prices[priceIx];

        if (price !== undefined) {
          result[index] = price;
          priceIx++;
        }
      }
    });

    return result;
  }
}
