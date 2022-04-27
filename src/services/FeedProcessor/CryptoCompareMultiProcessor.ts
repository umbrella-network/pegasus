import {inject, injectable} from 'inversify';

import {CryptoComparePriceMultiFetcher} from '../fetchers';
import {FeedFetcher} from '../../types/Feed';

import {InputParams, OutputValue} from '../fetchers/CryptoComparePriceMultiFetcher';

interface FeedFetcherParams {
  fsym: string;
  tsyms: string;
}

@injectable()
export default class CryptoCompareMultiProcessor {
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

  private sortOutput(feedFetchers: FeedFetcher[], values: OutputValue[]): number[] {
    const inputsIndexMap: {[key: string]: number} = {};

    feedFetchers.forEach((fetcher, index) => {
      const {fsym, tsyms} = fetcher.params as FeedFetcherParams;
      inputsIndexMap[`${fsym}:${tsyms}`] = index;
    });

    const result: number[] = [];
    result.length = feedFetchers.length;

    values.forEach(({fsym, tsym, value}) => {
      const index = inputsIndexMap[`${fsym}:${tsym}`];

      if (index !== undefined) {
        result[index] = value;
      }
    });

    return result;
  }
}
