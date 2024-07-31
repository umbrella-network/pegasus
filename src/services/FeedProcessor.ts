import {Logger} from 'winston';
import {MD5 as hash} from 'object-hash';
import {inject, injectable} from 'inversify';
import {price} from '@umb-network/validator';
import {LeafValueCoder} from '@umb-network/toolbox';

import Leaf from '../types/Leaf.js';
import MultiFeedProcessor from './feedProcessors/MultiFeedProcessor.js';
import {CalculatorRepository} from '../repositories/CalculatorRepository.js';
import {FeedFetcherRepository} from '../repositories/FeedFetcherRepository.js';
import Feeds, {FeedCalculator, FeedFetcher, FeedOutput, FeedValue} from '../types/Feed.js';
import {allMultiFetchers, FeedFetcherInputParams} from '../types/fetchers.js';
import FeedSymbolChecker from './FeedSymbolChecker.js';

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
  @inject(MultiFeedProcessor) multiFeedProcessor!: MultiFeedProcessor;
  @inject(CalculatorRepository) calculatorRepository!: CalculatorRepository;
  @inject(FeedFetcherRepository) feedFetcherRepository!: FeedFetcherRepository;
  @inject(FeedSymbolChecker) feedSymbolChecker!: FeedSymbolChecker;
  @inject('Logger') private logger!: Logger;

  private logPrefix = '[FeedProcessor]';

  async apply(timestamp: number, ...feedsArray: Feeds[]): Promise<Leaf[][]> {
    // collect unique inputs
    const uniqueFeedFetcherMap: {[hash: string]: FeedFetcher} = {};

    feedsArray.forEach((feeds) => {
      const keys = Object.keys(feeds);

      keys.forEach((leafLabel) =>
        feeds[leafLabel].inputs.forEach((input) => {
          uniqueFeedFetcherMap[hash(input.fetcher)] = {
            ...input.fetcher,
            symbol: leafLabel,
            base: feeds[leafLabel].base,
            quote: feeds[leafLabel].quote,
          };
        }),
      );
    });

    const {singleInputs, multiInputs} = this.separateInputs(uniqueFeedFetcherMap);

    const inputIndexByHash: {[hash: string]: number} = {};

    Object.keys(singleInputs).forEach((hash, index) => {
      inputIndexByHash[hash] = index;
    });

    const offset = Object.values(singleInputs).length;

    Object.keys(multiInputs).forEach((hash, index) => {
      inputIndexByHash[hash] = index + offset;
    });

    this.logger.debug(`${this.logPrefix} ${JSON.stringify(inputIndexByHash)}`);

    const [singleFeeds, multiFeeds] = await Promise.all([
      this.processFeeds(Object.values(singleInputs), timestamp),
      this.multiFeedProcessor.apply(Object.values(multiInputs)),
    ]);

    this.logger.debug(`${this.logPrefix} singleFeeds: ${JSON.stringify(singleFeeds)}`);
    this.logger.debug(`${this.logPrefix} multiFeeds: ${JSON.stringify(multiFeeds)}`);

    const values = [...singleFeeds, ...multiFeeds];

    const result: Leaf[][] = [];
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

        this.logger.debug(`${this.logPrefix} feedValues: ${JSON.stringify(feedValues)}`);

        if (feedValues.length === 1 && LeafValueCoder.isFixedValue(feedValues[0].key)) {
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

    this.logger.debug(`${this.logPrefix} result: ${JSON.stringify(result)}`);

    return result;
  }

  private async processFeed(feedFetcher: FeedFetcher, timestamp: number): Promise<unknown> {
    const fetcher = this.feedFetcherRepository.find(feedFetcher.name);

    if (!fetcher) {
      this.logger.warn(`${this.logPrefix} No fetcher specified for ${feedFetcher.name}`);
      return;
    }

    let result = this.getBaseAndQuote(feedFetcher);

    if (!result) {
      // TODO backwards compatibility code, it can be removed in future if feed config will be updated
      if (feedFetcher.symbol == 'FIXED_RAND') {
        this.logger.warn(`Apply hardcoded base & quote for symbol:${feedFetcher.symbol}`);
        result = ['RAND', 'FIXED'];
      } else if (feedFetcher.symbol == 'PolygonGas-TWAP10-wei') {
        this.logger.warn(`Apply hardcoded base & quote for symbol:${feedFetcher.symbol}`);
        result = ['PolygonGas_TWAP10', 'wei'];
      } else {
        this.logger.error(`Cannot parse base & quote from symbol:${feedFetcher.symbol}`);
        return;
      }
    }

    try {
      this.logger.debug(`${this.logPrefix} using "${feedFetcher.name}"`);
      const result = await fetcher.apply(feedFetcher.params as FeedFetcherInputParams, {
        symbols: [feedFetcher.symbol],
        timestamp,
      });

      if (result.prices.length > 1) {
        this.logger.error(
          `${this.logPrefix} result.prices has length bigger than 1.` +
            `fetcher: ${feedFetcher.name} length: ${result.prices.length}`,
        );
      }

      return result.prices.length === 1 ? result.prices[0] : undefined;
    } catch (err) {
      const {message, response} = err as FetcherError;
      const error = message || JSON.stringify(response?.data);

      this.logger.error(
        `${this.logPrefix} Ignored feed fetcher ${JSON.stringify(feedFetcher)} due to an error. ${error}`,
      );

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
      if (allMultiFetchers.has(fetcher.name)) {
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

  private getBaseAndQuote(feedFetcher: FeedFetcher): string[] | undefined {
    if (feedFetcher.base && feedFetcher.quote) {
      return [feedFetcher.base, feedFetcher.quote];
    } else {
      return this.feedSymbolChecker.apply(feedFetcher.symbol);
    }
  }
}

export default FeedProcessor;
