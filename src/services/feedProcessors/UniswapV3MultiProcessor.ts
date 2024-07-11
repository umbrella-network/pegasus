import {inject, injectable} from 'inversify';

import {FeedFetcher} from '../../types/Feed.js';
import {FeedMultiProcessorInterface, FetcherName, NumberOrUndefined} from '../../types/fetchers.js';
import UniswapV3MultiFetcher, {
  OutputValues,
  UniswapV3MultiFetcherParams,
} from '../dexes/uniswapV3/UniswapV3MultiFetcher.js';

import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import FeedSymbolChecker from '../FeedSymbolChecker.js';

interface FeedFetcherParams {
  base: string;
  quote: string;
}

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
        value: output.value.toString(),
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

  private sortOutput(feedFetchers: FeedFetcher[], values: (OutputValues | undefined)[]): NumberOrUndefined[] {
    const inputsIndexMap: {[key: string]: number} = {};

    feedFetchers.forEach((fetcher, index) => {
      if (fetcher.name != FetcherName.UNISWAP_V3) return;

      const {base, quote} = fetcher.params as FeedFetcherParams;
      inputsIndexMap[this.getKey(base, quote)] = index;
    });

    const result: (number | undefined)[] = [];
    result.length = feedFetchers.length;

    values.forEach((outputValues) => {
      if (!outputValues) return;

      const {base, quote, value} = outputValues;
      const index = inputsIndexMap[this.getKey(base, quote)];

      if (index !== undefined) {
        result[index] = parseFloat(value);
      }
    });

    return result;
  }

  private getKey(base: string, quote: string): string {
    return `${base}:${quote}`;
  }
}
