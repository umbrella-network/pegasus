import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ByBitSpotFetcher} from '../fetchers/index.js';
import {FeedFetcher} from '../../types/Feed.js';

import {ByBitSpotFetcherParams, OutputValue} from '../fetchers/ByBitSpotFetcher.js';
import {NumberProcessorResult, FeedFetcherInterface} from '../../types/fetchers.js';

interface FeedFetcherParams {
  symbol: string;
  fsym: string;
  tsym: string;
}

@injectable()
export default class ByBitMultiProcessor implements FeedFetcherInterface {
  @inject(ByBitSpotFetcher) byBitSpotFetcher!: ByBitSpotFetcher;

  async apply(feedFetchers: FeedFetcher[]): Promise<NumberProcessorResult[]> {
    const params = this.createParams(feedFetchers);
    const outputs = await this.byBitSpotFetcher.apply(params);

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
