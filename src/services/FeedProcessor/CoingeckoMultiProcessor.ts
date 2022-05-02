import {inject, injectable} from 'inversify';

import {InputParams, OutputValues} from '../fetchers/CoingeckoPriceMultiFetcher';

import {FeedFetcher} from '../../types/Feed';
import {CoingeckoPriceMultiFetcher} from '../fetchers';

@injectable()
export default class CoingeckoMultiProcessor {
  @inject(CoingeckoPriceMultiFetcher) coingeckoPriceMultiFetcher!: CoingeckoPriceMultiFetcher;

  async apply(feedFetchers: FeedFetcher[]): Promise<(number | undefined)[]> {
    const params = this.createParams(feedFetchers);
    const outputs = await this.coingeckoPriceMultiFetcher.apply(params);

    return this.sortOutput(feedFetchers, outputs);
  }

  private createParams(feedFetchers: FeedFetcher[]): InputParams[] {
    const inputs: InputParams[] = [];

    feedFetchers.forEach((fetcher) => {
      if (!fetcher.name.includes('Coingecko')) return;

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
