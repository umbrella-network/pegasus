import {inject, injectable} from 'inversify';

import {InputParams, OutputValues} from '../fetchers/BinancePriceMultiFetcher.js';

import {FeedFetcher} from '../../types/Feed.js';
import {BinancePriceMultiFetcher} from '../fetchers/index.js';
import {FetcherName} from '../../types/fetchers.js';
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
    const params = this.createParams(feedFetchers);
    const outputs = await this.binancePriceMultiFetcher.apply(params);

    const payloads: PriceDataPayload[] = [];

    for (const [ix, output] of outputs.entries()) {
      if (!output) continue;

      const result = this.feedSymbolChecker.apply(feedFetchers[ix].symbol);
      if (!result) continue;

      const [feedBase, feedQuote] = result;

      payloads.push({
        fetcher: FetcherName.BINANCE,
        value: output.value.toString(),
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

  private createParams(feedFetchers: FeedFetcher[]): InputParams[] {
    const inputs: InputParams[] = [];

    feedFetchers.forEach((fetcher) => {
      if (fetcher.name != FetcherName.BINANCE) return;

      const {id, currency} = fetcher.params as InputParams;
      inputs.push({id, currency});
    });

    return inputs;
  }

  private sortOutput(feedFetchers: FeedFetcher[], values: OutputValues[]): number[] {
    const inputsIndexMap: {[key: string]: number} = {};

    feedFetchers.forEach((fetcher, index) => {
      const {id, currency} = fetcher.params as InputParams;
      inputsIndexMap[`${id}:${currency}`] = index;
    });

    const result: number[] = [];
    result.length = feedFetchers.length;

    values.forEach(({id, currency, value}) => {
      const index = inputsIndexMap[`${id}:${currency}`];

      if (index !== undefined) {
        result[index] = value;
      }
    });

    return result;
  }
}
