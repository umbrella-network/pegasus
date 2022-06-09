import {Logger} from 'winston';
import {MD5 as hash} from 'object-hash';
import {inject, injectable} from 'inversify';
import {LeafValueCoder} from '@umb-network/toolbox';

import MultiFeedProcessor from './FeedProcessor/MultiFeedProcessor';
import {CalculatorRepository} from '../repositories/CalculatorRepository';
import {FeedFetcherRepository} from '../repositories/FeedFetcherRepository';
import Feeds, {FeedCalculator, FeedFetcher, FeedPrice, FeedsInputFetcher, FeedsInputHash} from '../types/Feed';
import {FeedDatum} from '../types/Datum';
import {FetcherError} from '../types/Fetcher';
import {ICalculator} from '../types/Calculator';

@injectable()
class FeedDataProcessor {
  @inject('Logger') logger!: Logger;
  @inject(MultiFeedProcessor) multiFeedProcessor!: MultiFeedProcessor;
  @inject(CalculatorRepository) calculatorRepository!: CalculatorRepository;
  @inject(FeedFetcherRepository) feedFetcherRepository!: FeedFetcherRepository;

  async apply(timestamp: number, ...feedsArray: Feeds[]): Promise<{data: FeedDatum[]; prices: FeedPrice[]}> {
    console.log('START FeedDataColector');
    const uniqueFeedFetcherMap = this.createUniqueFeedFetcherMap(feedsArray);

    const {singleInputs, multiInputs} = this.separateInputs(uniqueFeedFetcherMap);

    const inputIndexByHash = this.createInputByHash(singleInputs, multiInputs);

    const values = (await this.getProcessedFeeds(singleInputs, multiInputs, timestamp)) as FeedsInputHash;

    const {data, prices} = this.calculateDataFromFeeds(feedsArray, values, inputIndexByHash, timestamp);

    return {data, prices};
  }

  private createUniqueFeedFetcherMap(feedsArray: Feeds[]): FeedsInputFetcher {
    const uniqueFeedFetcherMap: FeedsInputFetcher = {};

    feedsArray.forEach((feeds: Feeds) => {
      const keys = Object.keys(feeds);

      keys.forEach((leafLabel) =>
        feeds[leafLabel].inputs.forEach((input) => {
          uniqueFeedFetcherMap[hash(input.fetcher)] = input.fetcher;
        }),
      );
    });

    return uniqueFeedFetcherMap;
  }

  private createInputByHash(singleInputs: FeedsInputFetcher, multiInputs: FeedsInputFetcher): FeedsInputHash {
    const inputIndexByHash: {[hash: string]: number} = {};

    Object.keys(singleInputs).forEach((hash, index) => {
      inputIndexByHash[hash] = index;
    });

    Object.keys(multiInputs).forEach((hash, index) => {
      const singleInputsLength = Object.values(singleInputs).length;
      inputIndexByHash[hash] = index + singleInputsLength;
    });

    return inputIndexByHash;
  }

  async getProcessedFeeds(
    singleInputs: FeedsInputFetcher,
    multiInputs: FeedsInputFetcher,
    timestamp: number,
  ): Promise<unknown> {
    const [singleFeeds, multiFeeds] = await Promise.all([
      this.processFetchers(Object.values(singleInputs), timestamp),
      this.multiFeedProcessor.apply(Object.values(multiInputs)),
    ]);

    return [...singleFeeds, ...multiFeeds];
  }

  private calculateDataFromFeeds(
    feedsArray: Feeds[],
    values: FeedsInputHash,
    inputIndexByHash: FeedsInputHash,
    timestamp: number,
  ) {
    const ignoredMap: {[key: string]: boolean} = {};
    const keyValueMap: {[key: string]: number} = {};
    const prices: FeedPrice[] = [];
    const data: FeedDatum[] = [];
    const date = new Date(timestamp * 1000);

    feedsArray.forEach((feeds) => {
      const tickers = Object.keys(feeds);

      tickers.forEach((ticker) => {
        const feed = feeds[ticker];

        const feedValues = feed.inputs
          .map((input) =>
            this.calculateFeed(
              ticker,
              values[inputIndexByHash[hash(input.fetcher)]],
              keyValueMap,
              input.fetcher.name,
              input.calculator,
            ),
          )
          .flat();

        if (!feedValues.length) {
          ignoredMap[ticker] = true;
        } else if (feedValues.length === 1 && LeafValueCoder.isFixedValue(feedValues[0].symbol)) {
          data.push(<FeedDatum>{
            symbol: feedValues[0].symbol,
            source: feedValues[0].source,
            value: String(feedValues[0].value),
            timestamp: date,
          });
        } else {
          feedValues.forEach((feed) => prices.push(<FeedPrice>{...feed, timestamp: date}));
        }
      });
    });

    const ignored = Object.keys(ignoredMap);

    if (ignored.length) {
      this.logger.warn(`Ignored: ${JSON.stringify(ignored)}`);
    }

    return {data, prices};
  }

  private async fetchData(feedFetcher: FeedFetcher, timestamp: number): Promise<unknown> {
    const fetcher = this.feedFetcherRepository.find(feedFetcher.name);

    if (!fetcher) {
      this.logger.debug(`No fetcher specified for ${feedFetcher.name}`);
      return;
    }

    try {
      const data = (await fetcher.apply(feedFetcher.params, timestamp)) || undefined;
      return data;
    } catch (err) {
      const {message, response} = err as FetcherError;
      const error = message || JSON.stringify(response?.data);
      this.logger.debug(`Ignored feed fetcher ${JSON.stringify(feedFetcher)} due to an error. ${error}`);
      return;
    }
  }

  private calculateFeed(
    key: string,
    value: unknown,
    prices: {[key: string]: number},
    fetcher: string,
    feedCalculator?: FeedCalculator,
  ): FeedPrice[] | FeedDatum[] {
    if (!value) return [];

    const calculator = <ICalculator>this.calculatorRepository.find(feedCalculator?.name || 'Identity');
    const calculatedPrice = calculator.apply(key, value, feedCalculator?.params, prices);

    return <FeedPrice[] | FeedDatum[]>(
      calculatedPrice.map((input) => ({symbol: input.key, value: input.value, source: fetcher}))
    );
  }

  private async processFetchers(feedFetchers: FeedFetcher[], timestamp: number): Promise<unknown[]> {
    return Promise.all(feedFetchers.map((input) => this.fetchData(input, timestamp)));
  }

  /**
   * Separates inputs that belong to CryptoComparePriceMulti and others
   */
  private separateInputs(uniqueFeedFetcherMap: FeedsInputFetcher) {
    const multiFetchingInputsNames = ['CryptoComparePrice', 'CoingeckoPrice'];

    const fetcherMapArr = Object.values(uniqueFeedFetcherMap);
    const fetcherKeys = Object.keys(uniqueFeedFetcherMap);

    const separatedInputs: {
      singleInputs: FeedsInputFetcher;
      multiInputs: FeedsInputFetcher;
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
}

export default FeedDataProcessor;
