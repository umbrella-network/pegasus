import {Logger} from 'winston';
import {MD5 as hash} from 'object-hash';
import {inject, injectable} from 'inversify';
import {price} from '@umb-network/validator';
import {LeafValueCoder} from '@umb-network/toolbox';

import Leaf from '../types/Leaf.js';
import MultiFeedProcessor from './FeedProcessor/MultiFeedProcessor.js';
import {CalculatorRepository} from '../repositories/CalculatorRepository.js';
import {FeedFetcherRepository} from '../repositories/FeedFetcherRepository.js';
import Feeds, {FeedCalculator, FeedFetcher, FeedOutput, FeedValue} from '../types/Feed.js';
import {FetcherHistoryInterface} from '../types/fetchers.js';
import {FetcherHistoryRepository} from '../repositories/FetcherHistoryRepository.js';

interface Calculator {
  // eslint-disable-next-line
  apply: (key: string, value: any, params: any, ...args: any[]) => FeedOutput[];
}

interface FetcherError {
  message?: string;
  response?: {
    data: string;
  };
}

@injectable()
class FeedProcessor {
  @inject('Logger') private logger!: Logger;

  @inject(MultiFeedProcessor) multiFeedProcessor!: MultiFeedProcessor;
  @inject(CalculatorRepository) calculatorRepository!: CalculatorRepository;
  @inject(FeedFetcherRepository) feedFetcherRepository!: FeedFetcherRepository;
  @inject(FetcherHistoryRepository) fetcherHistoryRepository!: FetcherHistoryRepository;

  async apply(timestamp: number, ...feedsArray: Feeds[]): Promise<Leaf[][]> {
    // collect unique inputs
    const uniqueFeedFetcherMap: {[hash: string]: FeedFetcher} = {};
    const history: FetcherHistoryInterface[] = [];

    feedsArray.forEach((feeds) => {
      const keys = Object.keys(feeds);

      keys.forEach((leafLabel) =>
        feeds[leafLabel].inputs.forEach((input) => {
          uniqueFeedFetcherMap[hash(input.fetcher)] = input.fetcher;
        }),
      );
    });

    const {singleInputs, multiInputs} = this.separateInputs(uniqueFeedFetcherMap);

    const inputIndexByHash: {[hash: string]: number} = {};

    Object.keys(singleInputs).forEach((hash, index) => {
      inputIndexByHash[hash] = index;
    });

    Object.keys(multiInputs).forEach((hash, index) => {
      const singleInputsLength = Object.values(singleInputs).length;
      inputIndexByHash[hash] = index + singleInputsLength;
    });

    const [singleFeeds, multiFeeds] = await Promise.all([
      this.processFeeds(Object.values(singleInputs), timestamp),
      this.multiFeedProcessor.apply(Object.values(multiInputs)),
    ]);

    const values = [...singleFeeds, ...multiFeeds];

    const result: Leaf[][] = [];
    const ignoredMap: {[key: string]: boolean} = {};
    const keyValueMap: {[key: string]: number} = {};

    feedsArray.forEach((feeds, ix) => {
      const tickers = Object.keys(feeds);
      const leaves: Leaf[] = [];

      tickers.forEach((ticker) => {
        const feed = feeds[ticker];

        const feedValues = feed.inputs
          .map((input) =>
            this.calculateFeed(ticker, values[inputIndexByHash[hash(input.fetcher)]], keyValueMap, input.calculator),
          )
          .flat();

        if (!feedValues.length) {
          ignoredMap[ticker] = true;
        } else if (feedValues.length === 1 && LeafValueCoder.isFixedValue(feedValues[0].key)) {
          leaves.push(this.buildLeaf(feedValues[0].key, feedValues[0].value));

          history.push(<FetcherHistoryInterface>{
            fetcher: feed.inputs[0].fetcher.name,
            symbol: feedValues[0].key,
            value: typeof feedValues[0].value == 'string' ? feedValues[0].value : feedValues[0].value.toString(),
            timestamp,
          });
        } else {
          // calculateFeed is allowed to return different keys
          const groups = FeedProcessor.groupInputs(feedValues);

          feedValues.forEach((feedValue, feedIx) => {
            history.push(<FetcherHistoryInterface>{
              fetcher: feed.inputs[feedIx].fetcher.name,
              symbol: feedValue.key,
              value: typeof feedValue.value == 'string' ? feedValue.value : feedValue.value.toString(),
              timestamp,
            });
          });

          for (const key in groups) {
            const value = FeedProcessor.calculateMean(groups[key] as number[], feed.precision);
            keyValueMap[key] = value;
            leaves.push(this.buildLeaf(key, (keyValueMap[key] = value)));
          }
        }
      });

      result.push(leaves);
    });

    this.logger.debug(`[FeedProcessor] result: ${JSON.stringify(result)}`);

    await this.fetcherHistoryRepository.saveMany(history);

    return result;
  }

  private async processFeed(feedFetcher: FeedFetcher, timestamp: number): Promise<unknown> {
    const fetcher = this.feedFetcherRepository.find(feedFetcher.name);

    if (!fetcher) {
      this.logger.warn(`No fetcher specified for ${feedFetcher.name}`);
      return;
    }

    try {
      return (await fetcher.apply(feedFetcher.params, timestamp)) || undefined;
    } catch (err) {
      const {message, response} = err as FetcherError;
      const error = message || JSON.stringify(response?.data);
      this.logger.error(`Ignored feed fetcher ${JSON.stringify(feedFetcher)} due to an error. ${error}`);
      return;
    }
  }

  private calculateFeed(
    key: string,
    value: unknown,
    prices: {[key: string]: number},
    feedCalculator?: FeedCalculator,
  ): FeedOutput[] {
    if (!value) return [];

    const calculator = <Calculator>this.calculatorRepository.find(feedCalculator?.name || 'Identity');

    return calculator.apply(key, value, feedCalculator?.params, prices);
  }

  private async processFeeds(feedFetchers: FeedFetcher[], timestamp: number): Promise<unknown[]> {
    return Promise.all(feedFetchers.map((input) => this.processFeed(input, timestamp)));
  }

  private buildLeaf = (label: string, value: FeedValue): Leaf => {
    return {
      label,
      valueBytes: `0x${LeafValueCoder.encode(value, label).toString('hex')}`,
    };
  };

  private static calculateMean(values: number[], precision: number): number {
    const multi = Math.pow(10, precision);

    return Math.round(price.mean(values) * multi) / multi;
  }

  /**
   * Separate fetchers into two different arrays
   * @return singleInputs will be fetched each with one API call
   * @return multiInputs will be aggregated by the respective processor to be fetched in one API call
   */
  private separateInputs(uniqueFeedFetcherMap: {[hash: string]: FeedFetcher}) {
    const multiFetchingInputsNames = ['CryptoComparePrice', 'CoingeckoPrice', 'UniswapV3'];

    const fetcherMapArr = Object.values(uniqueFeedFetcherMap);
    const fetcherKeys = Object.keys(uniqueFeedFetcherMap);

    const separatedInputs: {
      singleInputs: {[hash: string]: FeedFetcher};
      multiInputs: {[hash: string]: FeedFetcher};
    } = {
      singleInputs: {},
      multiInputs: {},
    };

    fetcherMapArr.forEach((fetcher: FeedFetcher, index) => {
      if (multiFetchingInputsNames.includes(fetcher.name)) {
        separatedInputs.multiInputs[fetcherKeys[index]] = fetcher;
      } else {
        separatedInputs.singleInputs[fetcherKeys[index]] = fetcher;
      }
    });

    return separatedInputs;
  }

  private static groupInputs(outputs: FeedOutput[]) {
    type OutputValue = number | string;

    const result: {[key: string]: OutputValue[]} = {};

    for (const {key, value} of outputs) {
      let array = result[key];
      if (!array) {
        result[key] = array = [];
      }

      array.push(value);
    }

    return result;
  }
}

export default FeedProcessor;
