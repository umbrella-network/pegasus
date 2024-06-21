import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {InputParams, OutputValues} from '../fetchers/CoingeckoPriceMultiFetcher.js';
import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import {CoingeckoPriceMultiFetcher} from '../fetchers/index.js';
import {FeedFetcher} from '../../types/Feed.js';
import {FetcherName} from '../../types/fetchers.js';
import TimeService from '../TimeService.js';
import FeedChecker from '../FeedChecker.js';

@injectable()
export default class CoingeckoMultiProcessor {
  @inject(CoingeckoPriceMultiFetcher) coingeckoPriceMultiFetcher!: CoingeckoPriceMultiFetcher;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject(FeedChecker) private feedChecker!: FeedChecker;
  @inject('Logger') private logger!: Logger;

  static fetcherSource = '';

  async apply(feedFetchers: FeedFetcher[]): Promise<(number | undefined)[]> {
    const params = this.createParams(feedFetchers);
    const outputs = await this.coingeckoPriceMultiFetcher.apply(params);

    const payloads: PriceDataPayload[] = [];

    for (const [ix, output] of outputs.entries()) {
      const result = this.feedChecker.getBaseAndQuote(feedFetchers[ix].symbol);

      if (result.length === 2) {
        const [feedBase, feedQuote] = result;

        if (output) {
          payloads.push({
            fetcher: FetcherName.COINGECKO_PRICE,
            value: output.value.toString(),
            valueType: PriceValueType.Price,
            timestamp: this.timeService.apply(),
            feedBase,
            feedQuote,
            fetcherSource: CoingeckoMultiProcessor.fetcherSource,
          });
        }
      }
    }

    await this.priceDataRepository.savePrices(payloads);

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
