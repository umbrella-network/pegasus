import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {CryptoComparePriceMultiFetcher} from '../fetchers/index.js';
import {FeedFetcher} from '../../types/Feed.js';

import {InputParams, OutputValue} from '../fetchers/CryptoComparePriceMultiFetcher.js';

interface FeedFetcherParams {
  fsym: string;
  tsyms: string;
}

@injectable()
export default class CryptoCompareMultiProcessor {
  @inject('Logger') private logger!: Logger;

  @inject(CryptoComparePriceMultiFetcher) cryptoComparePriceMultiFetcher!: CryptoComparePriceMultiFetcher;

  async apply(feedFetchers: FeedFetcher[]): Promise<(number | undefined)[]> {
    const params = this.createParams(feedFetchers);
    const outputs = await this.cryptoComparePriceMultiFetcher.apply(params);

    return this.sortOutput(feedFetchers, outputs);
  }

  private createParams(feedInputs: FeedFetcher[]): InputParams {
    const fsymSet = new Set<string>(),
      tsymSet = new Set<string>();

    feedInputs.forEach((fetcher) => {
      if (!fetcher.name.includes('CryptoCompare')) return;

      const {fsym, tsyms} = fetcher.params as FeedFetcherParams;

      fsymSet.add(fsym);
      tsymSet.add(tsyms);
    });

    return {
      fsyms: [...fsymSet],
      tsyms: [...tsymSet],
    };
  }

  protected sortOutput(feedFetchers: FeedFetcher[], values: OutputValue[]): number[] {
    const inputsIndexMap: {[key: string]: number} = {};

    feedFetchers.forEach((fetcher, index) => {
      const {fsym, tsyms} = fetcher.params as FeedFetcherParams;
      // params might have different case but it will be accepted in API call and it will produce valid oputput
      inputsIndexMap[`${fsym}:${tsyms}`.toUpperCase()] = index;
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
