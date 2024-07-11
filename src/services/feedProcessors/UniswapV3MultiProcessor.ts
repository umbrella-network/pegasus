import {inject, injectable} from 'inversify';

import {FeedFetcher} from '../../types/Feed.js';
import {FeedMultiProcessorInterface, FetcherName, NumberOrUndefined} from '../../types/fetchers.js';
import UniswapV3MultiFetcher, {UniswapV3MultiFetcherParams} from '../dexes/uniswapV3/UniswapV3MultiFetcher.js';

import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import FeedSymbolChecker from '../FeedSymbolChecker.js';

@injectable()
export default class UniswapV3MultiProcessor implements FeedMultiProcessorInterface {
  @inject(UniswapV3MultiFetcher) uniswapV3MultiFetcher!: UniswapV3MultiFetcher;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(FeedSymbolChecker) private feedSymbolChecker!: FeedSymbolChecker;
  @inject(TimeService) private timeService!: TimeService;

  static fetcherSource = '';

  async apply(feedFetchers: FeedFetcher[]): Promise<NumberOrUndefined[]> {
    const params = this.createParams(feedFetchers);
    const outputs = await this.uniswapV3MultiFetcher.apply(params);

    const payloads: PriceDataPayload[] = [];

    for (const [ix, output] of outputs.entries()) {
      if (!output) continue;

      const result = this.feedSymbolChecker.apply(feedFetchers[ix].symbol);
      if (!result) continue;

      const [feedBase, feedQuote] = result;

      payloads.push({
        fetcher: FetcherName.UNISWAP_V3,
        value: output.toString(),
        valueType: PriceValueType.Price,
        timestamp: this.timeService.apply(),
        feedBase,
        feedQuote,
        fetcherSource: UniswapV3MultiProcessor.fetcherSource,
      });
    }

    await this.priceDataRepository.savePrices(payloads);

    return this.sortOutput(feedFetchers, outputs);
  }

  private createParams(feedInputs: FeedFetcher[]): UniswapV3MultiFetcherParams[] {
    const params: UniswapV3MultiFetcherParams[] = [];

    feedInputs.forEach((fetcher) => {
      if (!fetcher.name.includes(FetcherName.UNISWAP_V3)) return;

      const {fromChain, base, quote, amountInDecimals} = fetcher.params as UniswapV3MultiFetcherParams;
      params.push({fromChain, base, quote, amountInDecimals});
    });

    return params;
  }

  private sortOutput(feedFetchers: FeedFetcher[], prices: NumberOrUndefined[]): NumberOrUndefined[] {
    const result: NumberOrUndefined[] = [];
    result.length = feedFetchers.length;

    let priceIx = 0;

    feedFetchers.forEach((fetcher, index) => {
      if (!fetcher.name.includes(FetcherName.UNISWAP_V3)) return;

      const price = prices[priceIx];

      if (price !== undefined) {
        result[index] = price;
        priceIx++;
      }
    });

    return result;
  }

  private getKey(base: string, quote: string): string {
    return `${base}:${quote}`;
  }
}
