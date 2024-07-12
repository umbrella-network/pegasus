import {inject, injectable} from 'inversify';

import {ByBitSpotFetcher} from '../fetchers/index.js';
import {FeedFetcher} from '../../types/Feed.js';

import {ByBitSpotFetcherParams, OutputValue} from '../fetchers/ByBitSpotFetcher.js';
import {NumberOrUndefined, FeedFetcherInterface, FetcherName} from '../../types/fetchers.js';
import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import FeedSymbolChecker from '../FeedSymbolChecker.js';

interface FeedFetcherParams {
  symbol: string;
  fsym: string;
  tsym: string;
}

@injectable()
export default class ByBitMultiProcessor implements FeedFetcherInterface {
  @inject(ByBitSpotFetcher) byBitSpotFetcher!: ByBitSpotFetcher;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(FeedSymbolChecker) private feedSymbolChecker!: FeedSymbolChecker;
  @inject(TimeService) private timeService!: TimeService;

  static fetcherSource = '';

  async apply(feedFetchers: FeedFetcher[]): Promise<NumberOrUndefined[]> {
    const params = this.createParams(feedFetchers);
    const outputs = await this.byBitSpotFetcher.apply(params);

    const payloads: PriceDataPayload[] = [];

    for (const [ix, output] of outputs.entries()) {
      if (!output) continue;

      const result = this.feedSymbolChecker.apply(feedFetchers[ix].symbol);
      if (!result) continue;

      const [feedBase, feedQuote] = result;

      payloads.push({
        fetcher: FetcherName.BY_BIT,
        value: output.value.toString(),
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

  private createParams(feedInputs: FeedFetcher[]): ByBitSpotFetcherParams {
    const symbolMap = new Map<string, {fsym: string; tsym: string}>();

    feedInputs.forEach((fetcher) => {
      if (!fetcher.name.includes('ByBit')) return;

      const {symbol, fsym, tsym} = fetcher.params as FeedFetcherParams;

      symbolMap.set(symbol, {
        fsym,
        tsym,
      });
    });

    return symbolMap;
  }

  protected sortOutput(feedFetchers: FeedFetcher[], values: OutputValue[]): number[] {
    const inputsIndexMap: {[key: string]: number} = {};

    feedFetchers.forEach((fetcher, index) => {
      if (fetcher.name != FetcherName.BY_BIT) return;

      const {fsym, tsym} = fetcher.params as FeedFetcherParams;
      // params might have different case but it will be accepted in API call and it will produce valid oputput
      inputsIndexMap[`${fsym}:${tsym}`.toUpperCase()] = index;
    });

    const result: number[] = [];
    result.length = feedFetchers.length;

    values.forEach(({fsym, tsym, value}) => {
      const index = inputsIndexMap[`${fsym}:${tsym}`.toUpperCase()];

      if (index !== undefined) {
        result[index] = value;
      }
    });

    return result;
  }
}
