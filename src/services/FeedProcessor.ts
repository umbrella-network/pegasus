import {inject, injectable} from 'inversify';
import {price} from '@umb-network/validator';
import {MD5 as hash} from 'object-hash';
import {Logger} from 'winston';
import {LeafValueCoder} from '@umb-network/toolbox';

import Feeds, {FeedCalculator, FeedFetcher, FeedOutput, FeedValue} from '../types/Feed';
import Leaf from '../types/Leaf';
import {
  InputParams as CryptoComparePriceMultiFetcherParams,
  OutputValue as CryptoComparePriceMultiFetcherOutputValue,
} from './fetchers/CryptoComparePriceMultiFetcher';
import {CalculatorRepository} from '../repositories/CalculatorRepository';
import {FeedFetcherRepository} from '../repositories/FeedFetcherRepository';
import {CryptoComparePriceMultiFetcher} from './fetchers';

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
  @inject('Logger') logger!: Logger;
  @inject(CalculatorRepository) calculatorRepository!: CalculatorRepository;
  @inject(FeedFetcherRepository) feedFetcherRepository!: FeedFetcherRepository;
  @inject(CryptoComparePriceMultiFetcher) cryptoComparePriceMultiFetcher!: CryptoComparePriceMultiFetcher;

  async apply(timestamp: number, ...feedsArray: Feeds[]): Promise<Leaf[][]> {
    // collect unique inputs
    const uniqueFeedFetcherMap: {[hash: string]: FeedFetcher} = {};

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
      this.processMultiFeeds(Object.values(multiInputs)),
    ]);

    const values = [...singleFeeds, ...multiFeeds];
    const result: Leaf[][] = [];
    const ignoredMap: {[key: string]: boolean} = {};

    const keyValueMap: {[key: string]: number} = {};

    feedsArray.forEach((feeds) => {
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
        } else {
          // calculateFeed is allowed to return different keys
          const groups = FeedProcessor.groupInputs(feedValues);
          for (const key in groups) {
            const value = FeedProcessor.calculateMean(groups[key] as number[], feed.precision);
            keyValueMap[key] = value;
            leaves.push(this.buildLeaf(key, (keyValueMap[key] = value)));
          }
        }
      });

      result.push(leaves);
    });

    const ignored = Object.keys(ignoredMap);

    if (ignored.length) {
      ////// this.logger.warn(`Ignored: ${JSON.stringify(ignored)}`);
    }

    return result;
  }

  async processFeed(feedFetcher: FeedFetcher, timestamp: number): Promise<unknown> {
    const fetcher = this.feedFetcherRepository.find(feedFetcher.name);

    if (!fetcher) {
      this.logger.debug(`No fetcher specified for ${feedFetcher.name}`);
      return;
    }

    try {
      return (await fetcher.apply(feedFetcher.params, timestamp)) || undefined;
    } catch (err) {
      const {message, response} = err as FetcherError;
      const error = message || JSON.stringify(response?.data);
      this.logger.debug(`Ignored feed fetcher ${JSON.stringify(feedFetcher)} due to an error. ${error}`);
      return;
    }
  }

  calculateFeed(
    key: string,
    value: unknown,
    prices: {[key: string]: number},
    feedCalculator?: FeedCalculator,
  ): FeedOutput[] {
    if (!value) return [];

    const calculator = <Calculator>this.calculatorRepository.find(feedCalculator?.name || 'Identity');
    return calculator.apply(key, value, feedCalculator?.params, prices);
  }

  async processFeeds(feedFetchers: FeedFetcher[], timestamp: number): Promise<unknown[]> {
    return Promise.all(feedFetchers.map((input) => this.processFeed(input, timestamp)));
  }

  async processMultiFeeds(feedFetchers: FeedFetcher[]): Promise<unknown[]> {
    if (!feedFetchers.length) return [];

    const params = this.createComparePriceMultiParams(feedFetchers);
    let values: CryptoComparePriceMultiFetcherOutputValue[];

    try {
      values = await this.cryptoComparePriceMultiFetcher.apply(params);
    } catch (err) {
      this.logger.warn(`Ignored CryptoComparePriceMulti feed with ${JSON.stringify(params)} due to an error.`, err);
      return [];
    }

    return this.orderCryptoComparePriceMultiOutput(feedFetchers, values);
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
   * Separates inputs that belong to CryptoComparePriceMulti and others
   */
  private separateInputs(uniqueFeedFetcherMap: {[hash: string]: FeedFetcher}) {
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
      if (fetcher.name === 'CryptoComparePrice') {
        separatedInputs.multiInputs[fetcherKeys[index]] = fetcher;
      } else {
        separatedInputs.singleInputs[fetcherKeys[index]] = fetcher;
      }
    });

    return separatedInputs;
  }

  /**
   * Filters CryptoComparePriceMulti outputs based on CryptoComparePrice inputs
   */
  private orderCryptoComparePriceMultiOutput(
    feedFetchers: FeedFetcher[],
    values: CryptoComparePriceMultiFetcherOutputValue[],
  ): (number | undefined)[] {
    const inputsIndexMap: {[key: string]: number} = {};
    feedFetchers.forEach((fetcher, index) => {
      const {fsym, tsyms} = fetcher.params as never;
      inputsIndexMap[`${fsym}:${tsyms}`] = index;
    });

    const result: (number | undefined)[] = [];
    result.length = feedFetchers.length;

    values.forEach(({fsym, tsym, value}) => {
      const index = inputsIndexMap[`${fsym}:${tsym}`];
      if (index !== undefined) {
        result[index] = value;
      }
    });

    return result;
  }

  /**
   * Creates a CryptoComparePriceMulti input params based CryptoComparePrice inputs
   * @param feedInputs Inputs with CryptoComparePrice fetcher
   */
  private createComparePriceMultiParams(feedInputs: FeedFetcher[]): CryptoComparePriceMultiFetcherParams {
    const fsymSet = new Set<string>(),
      tsymSet = new Set<string>();

    feedInputs.forEach((fetcher) => {
      const {fsym, tsyms} = fetcher.params as never;

      fsymSet.add(fsym);
      tsymSet.add(tsyms);
    });

    return {
      fsyms: [...fsymSet],
      tsyms: [...tsymSet],
    };
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
