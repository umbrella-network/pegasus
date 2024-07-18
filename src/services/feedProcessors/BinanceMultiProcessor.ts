import {inject, injectable} from 'inversify';

import {InputParams} from '../fetchers/BinancePriceMultiFetcher.js';
import {FeedFetcher} from '../../types/Feed.js';
import {BinancePriceMultiFetcher} from '../fetchers/index.js';
import {FetcherName, NumberOrUndefined} from '../../types/fetchers.js';
import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import FeedSymbolChecker from '../FeedSymbolChecker.js';

@injectable()
export default class BinanceMultiProcessor {
  @inject(BinancePriceMultiFetcher) binancePriceMultiFetcher!: BinancePriceMultiFetcher;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(FeedSymbolChecker) private feedSymbolChecker!: FeedSymbolChecker;
  @inject(TimeService) private timeService!: TimeService;

  static fetcherSource = '';

  async apply(feedFetchers: FeedFetcher[]): Promise<(number | undefined)[]> {
    const binanceInputs = feedFetchers.filter((fetcher) => fetcher.name === FetcherName.BINANCE);
    const params = binanceInputs.map((fetcher) => fetcher.params as InputParams);
    const outputs = await this.binancePriceMultiFetcher.apply(params);

    const payloads: PriceDataPayload[] = [];

    for (const [ix, output] of outputs.entries()) {
      if (!output) continue;

      const result = this.feedSymbolChecker.apply(binanceInputs[ix].symbol);
      if (!result) continue;

      const [feedBase, feedQuote] = result;

      payloads.push({
        fetcher: FetcherName.BINANCE,
        value: output.toString(),
        valueType: PriceValueType.Price,
        timestamp: this.timeService.apply(),
        feedBase,
        feedQuote,
        fetcherSource: BinanceMultiProcessor.fetcherSource,
      });
    }

    await this.priceDataRepository.savePrices(payloads);

    return this.sortOutput(feedFetchers, outputs);
  }

  private sortOutput(feedFetchers: FeedFetcher[], prices: NumberOrUndefined[]): NumberOrUndefined[] {
    const result: NumberOrUndefined[] = [];
    result.length = feedFetchers.length;

    let priceIx = 0;

    feedFetchers.forEach((fetcher, index) => {
      if (fetcher.name == FetcherName.BINANCE) {
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
