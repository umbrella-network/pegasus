import {Logger} from 'winston';
import {MD5 as hash} from 'object-hash';
import {inject, injectable} from 'inversify';
import {price} from '@umb-network/validator';
import {LeafValueCoder} from '@umb-network/toolbox';

import Leaf from '../types/Leaf.js';
import MultiFeedProcessor from './feedProcessors/MultiFeedProcessor.js';
import {FeedFetcherRepository} from '../repositories/FeedFetcherRepository.js';
import Feeds, {AveragePriceMethod, FeedFetcher, FeedOutput, FeedValue} from '../types/Feed.js';
import {allMultiFetchers, FeedPrice} from '../types/fetchers.js';
import FeedSymbolChecker from './FeedSymbolChecker.js';

interface FetcherError {
  message?: string;
  response?: {
    data: string;
  };
}

@injectable()
class FeedProcessor {
  @inject(MultiFeedProcessor) multiFeedProcessor!: MultiFeedProcessor;
  @inject(FeedFetcherRepository) feedFetcherRepository!: FeedFetcherRepository;
  @inject(FeedSymbolChecker) feedSymbolChecker!: FeedSymbolChecker;
  @inject('Logger') private logger!: Logger;

  private logPrefix = '[FeedProcessor]';

  async apply(timestamp: number, ...feedsArray: Feeds[]): Promise<Leaf[][]> {
    // collect unique inputs
    const uniqueFeedFetcherMap: {[hash: string]: FeedFetcher} = {};

    feedsArray.forEach((feeds: Feeds) => {
      const keys = Object.keys(feeds);

      keys.forEach((leafLabel) =>
        feeds[leafLabel].inputs.forEach((input) => {
          uniqueFeedFetcherMap[hash(input.fetcher)] = {
            ...input.fetcher,
            symbol: leafLabel,
            base: feeds[leafLabel].base, // TODO remove base/quote
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

    const [singleFeeds, multiFeeds]: [(undefined | FeedPrice)[], (undefined | FeedPrice)[]] = await Promise.all([
      this.processFeeds(Object.values(singleInputs), timestamp),
      this.multiFeedProcessor.apply(Object.values(multiInputs), timestamp),
    ]);

    this.logger.debug(`${this.logPrefix} singleFeeds: ${JSON.stringify(singleFeeds)}`);
    this.logger.debug(`${this.logPrefix} multiFeeds: ${JSON.stringify(multiFeeds)}`);

    const allFeeds: (FeedPrice | undefined)[] = [...singleFeeds, ...multiFeeds];

    const result: Leaf[][] = [];

    console.log(`${this.logPrefix} inputIndexByHash ${JSON.stringify(inputIndexByHash)}`);

    feedsArray.forEach((feeds) => {
      const tickers = Object.keys(feeds);
      const leaves: Leaf[] = [];

      tickers.forEach((ticker) => {
        console.log(`[tickers.forEach] ticker ${ticker}`);
        console.log(`[tickers.forEach] keyValueMap ${JSON.stringify(keyValueMap)}`);

        const feed = feeds[ticker];

        const feedValues = feed.inputs
          .map((input) => this.mergeKeyWithFeed(ticker, allFeeds[inputIndexByHash[hash(input.fetcher)]]))
          .flat();

        this.logger.debug(`${this.logPrefix} feedValues: ${JSON.stringify(feedValues)}`);

        if (feedValues.length === 1 && LeafValueCoder.isFixedValue(feedValues[0].key)) {
          if (feedValues[0].feedPrice.value == undefined) {
            throw new Error(`${this.logPrefix} ${feedValues[0].key} has undefined value`);
          }

          leaves.push(this.buildLeaf(feedValues[0].key, feedValues[0].feedPrice.value));
        } else {
          // calculateFeed is allowed to return different keys
          const groups = FeedProcessor.groupInputs(feedValues);

          for (const key in groups) {
            let value;

            switch (feed.averagePriceMethod) {
              case AveragePriceMethod.VWAP:
                this.logger.debug(`key: ${key}`);
                this.logger.debug(`groups: ${JSON.stringify(groups)}`);
                this.logger.debug(`feeds: ${JSON.stringify(feeds)}`);
                this.logger.debug(`allFeeds: ${JSON.stringify(allFeeds)}`);
                this.logger.debug(`feedValues: ${JSON.stringify(feedValues)}`);

                value = this.calculateVwap(groups[key], feed.precision);

                this.logger.debug(`vwap = ${value}`);
                break;

              case AveragePriceMethod.MEAN:
              default:
                value = FeedProcessor.calculateMean(groups[key].map(g => g.value) as number[], feed.precision);
            }

            if (!value) return;

            keyValueMap[key] = value;
            leaves.push(this.buildLeaf(key, value));
          }
        }
      });

      result.push(leaves);
    });

    this.logger.debug(`${this.logPrefix} result: ${JSON.stringify(result)}`);
    this.logger.debug(`keyValueMap: ${JSON.stringify(keyValueMap)}`);

    return result;
  }

  private async processFeed(feedFetcher: FeedFetcher, timestamp: number): Promise<FeedPrice | undefined> {
    const fetcher = this.feedFetcherRepository.find(feedFetcher.name);

    if (!fetcher) {
      this.logger.warn(`${this.logPrefix} No fetcher specified for ${feedFetcher.name}`);
      return;
    }

    try {
      this.logger.debug(`${this.logPrefix} using "${feedFetcher.name}"`);

      const result = await fetcher.apply([feedFetcher.params], {
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
      this.logger.debug(err);
      const {message, response} = err as FetcherError;
      const error = message || JSON.stringify(response?.data);

      this.logger.error(
        `${this.logPrefix} Ignored feed fetcher ${JSON.stringify(feedFetcher)} due to an error. ${error}`,
      );

      return;
    }
  }

  private mergeKeyWithFeed(key: string, feedPrice: FeedPrice | undefined): FeedOutput[] {
    if (!feedPrice || feedPrice.value == undefined) return [];

    return [
      {
        key,
        feedPrice,
      },
    ];
  }

  private async processFeeds(feedFetchers: FeedFetcher[], timestamp: number): Promise<(undefined | FeedPrice)[]> {
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

  private calculateVwap(feedPrices: FeedPrice[], precision: number): number | undefined {
    if (feedPrices.length == 0) {
      this.logger.warn('[calculateVwap] no values');
      return;
    }

    if (feedPrices.filter((f) => f.vwapVolume != undefined).length == 0) {
      this.logger.warn('[calculateVwap] no volumes');
      return;
    }

    const totalVolume = feedPrices.reduce((acc: number, n) => acc + (n.vwapVolume ?? 0), 0);

    const weightedValues = feedPrices.map((v) => {
      if (!v.vwapVolume) return 0;
      if (!v.value) return 0;

      return (v.value * v.vwapVolume) / totalVolume;
    });

    const waightedSum = weightedValues.reduce((acc, n) => acc + n, 0);

    this.logger.debug(`[calculateVwap] totalVolume: ${totalVolume}, ${weightedValues}, waightedSum: ${waightedSum}`);

    const multi = Math.pow(10, precision);
    return Math.round(waightedSum * multi) / multi;
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

  private static groupInputs(outputs: FeedOutput[]): {[key: string]: FeedPrice[]} {
    type OutputValue = FeedPrice;

    const result: {[key: string]: OutputValue[]} = {};

    for (const {key, feedPrice} of outputs) {
      let array = result[key];

      if (!array) {
        result[key] = array = [];
      }

      if (feedPrice.value == undefined) throw new Error(`[FeedProcessor] undefined value for key ${key}`);
      array.push(feedPrice);
    }

    return result;
  }
}

export default FeedProcessor;
