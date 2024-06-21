import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {CryptoComparePriceMultiFetcher} from '../fetchers/index.js';
import {FeedFetcher} from '../../types/Feed.js';

import {InputParams, OutputValue} from '../fetchers/CryptoComparePriceMultiFetcher.js';
import {CryptoCompareMultiProcessorResult, FeedFetcherInterface} from '../../types/fetchers.js';

import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import {FetcherName} from '../../types/fetchers.js';
import TimeService from '../TimeService.js';
import {feedNameToBaseAndQuote} from '../../utils/hashFeedName.js';

interface FeedFetcherParams {
  fsym: string;
  tsyms: string;
}

@injectable()
export default class CryptoCompareMultiProcessor implements FeedFetcherInterface {
  @inject(CryptoComparePriceMultiFetcher) cryptoComparePriceMultiFetcher!: CryptoComparePriceMultiFetcher;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  static fetcherSource = '';

  async apply(feedFetchers: FeedFetcher[]): Promise<CryptoCompareMultiProcessorResult[]> {
    const params = this.createParams(feedFetchers);
    const outputs = await this.cryptoComparePriceMultiFetcher.apply(params);

    const payloads: PriceDataPayload[] = [];

    for (const [ix, output] of outputs.entries()) {
      try {
        const [feedBase, feedQuote] = feedNameToBaseAndQuote(feedFetchers[ix].symbol || '-');

        if (output) {
          payloads.push({
            fetcher: FetcherName.CRYPTO_COMPARE_PRICE,
            value: output.value.toString(),
            valueType: PriceValueType.STRING,
            timestamp: this.timeService.apply(),
            feedBase,
            feedQuote,
            fetcherSource: CryptoCompareMultiProcessor.fetcherSource,
          });
        }
      } catch (error) {
        this.logger.error('[CoingeckoMultiProcessor] failed to get price for pairs.', error);
      }
    }

    await this.priceDataRepository.savePrices(payloads);

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
