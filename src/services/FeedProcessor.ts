import {inject, injectable} from 'inversify';
import {MD5 as hash} from 'object-hash';
import {Logger} from 'winston';
import {LeafValueCoder} from '@umb-network/toolbox';

import Feeds from '../types/Feed';
import Leaf from '../types/Leaf';
import * as fetchers from './fetchers';
import * as calculators from './calculators';
import {FeedCalculator, FeedFetcher, FeedOutput} from '../types/Feed';
import {
  InputParams as CryptoComparePriceMultiFetcherParams,
  OutputValue as CryptoComparePriceMultiFetcherOutputValue,
} from './fetchers/CryptoComparePriceMultiFetcher';

interface LeafBuilders {
  LeafBuilder: LeafBuilder;
  OptionsPriceLeavesBuilder: OptionsPriceLeavesBuilder;
}

interface Fetcher {
  // eslint-disable-next-line
  apply: (params: any, timestamp: number) => Promise<any>;
}

interface Calculator {
  // eslint-disable-next-line
  apply: (key: string, value: any, params: any, ...args: any[]) => FeedOutput[];
}

@injectable()
class FeedProcessor {
  @inject('Logger') logger!: Logger;

  fetchers: {[key: string]: Fetcher};
  calculators: {[key: string]: Calculator};
  leafBuilders: LeafBuilders;

  CryptoComparePriceMultiFetcher: fetchers.CryptoComparePriceMultiFetcher;

  constructor(
    @inject(fetchers.CryptoCompareHistoHourFetcher)
    CryptoCompareHistoHourFetcher: fetchers.CryptoCompareHistoHourFetcher,
    @inject(fetchers.CryptoCompareHistoDayFetcher) CryptoCompareHistoDayFetcher: fetchers.CryptoCompareHistoDayFetcher,
    @inject(fetchers.CryptoComparePriceMultiFetcher)
    CryptoComparePriceMultiFetcher: fetchers.CryptoComparePriceMultiFetcher,
    @inject(fetchers.GVolImpliedVolatilityFetcher) GVolImpliedVolatilityFetcher: fetchers.GVolImpliedVolatilityFetcher,
    @inject(fetchers.PolygonIOStockPriceFetcher) PolygonIOStockPriceFetcher: fetchers.PolygonIOStockPriceFetcher,
    @inject(fetchers.PolygonIOStockPriceFetcher) PolygonIOPriceFetcher: fetchers.PolygonIOStockPriceFetcher,
    @inject(fetchers.PolygonIOCryptoPriceFetcher) PolygonIOCryptoPriceFetcher: fetchers.PolygonIOCryptoPriceFetcher,
    @inject(fetchers.CryptoComparePriceWSFetcher) CryptoComparePriceWSFetcher: fetchers.CryptoComparePriceWSFetcher,
    @inject(fetchers.IEXEnergyFetcher) IEXEnergyFetcher: fetchers.IEXEnergyFetcher,
    @inject(fetchers.CoingeckoPriceFetcher) CoingeckoPriceFetcher: fetchers.CoingeckoPriceFetcher,
    @inject(fetchers.CoinmarketcapPriceFetcher) CoinmarketcapPriceFetcher: fetchers.CoinmarketcapPriceFetcher,
    @inject(fetchers.CoinmarketcapHistoHourFetcher)
    CoinmarketcapHistoHourFetcher: fetchers.CoinmarketcapHistoHourFetcher,
    @inject(fetchers.CoinmarketcapHistoDayFetcher) CoinmarketcapHistoDayFetcher: fetchers.CoinmarketcapHistoDayFetcher,
    @inject(fetchers.BEACPIAverageFetcher) BEACPIAverageFetcher: fetchers.BEACPIAverageFetcher,
    @inject(fetchers.OnChainDataFetcher) OnChainDataFetcher: fetchers.OnChainDataFetcher,
    @inject(fetchers.KaikoPriceStreamFetcher) KaikoPriceStreamFetcher: fetchers.KaikoPriceStreamFetcher,
    @inject(fetchers.YearnVaultTokenPriceFetcher) YearnVaultTokenPriceFetcher: fetchers.YearnVaultTokenPriceFetcher,

    @inject(calculators.TWAPCalculator) TWAPCalculator: calculators.TWAPCalculator,
    @inject(calculators.IdentityCalculator) IdentityCalculator: calculators.IdentityCalculator,
    @inject(calculators.VWAPCalculator) VWAPCalculator: calculators.VWAPCalculator,
    @inject(calculators.YearnTransformPriceCalculator) YearnTransformPriceCalculator: calculators.YearnTransformPriceCalculator,
  ) {
    this.fetchers = {
      CryptoCompareHistoHourFetcher,
      GVolImpliedVolatilityFetcher,
      CryptoCompareHistoDayFetcher,
      PolygonIOPriceFetcher,
      PolygonIOStockPriceFetcher,
      PolygonIOCryptoPriceFetcher,
      CryptoComparePriceWSFetcher,
      IEXEnergyFetcher,
      CoingeckoPriceFetcher,
      CoinmarketcapPriceFetcher,
      CoinmarketcapHistoHourFetcher,
      CoinmarketcapHistoDayFetcher,
      BEACPIAverageFetcher,
      OnChainDataFetcher,
      KaikoPriceStreamFetcher,
      YearnVaultTokenPriceFetcher,
    };

    this.calculators = {
      TWAPCalculator,
      IdentityCalculator,
      VWAPCalculator,
      YearnTransformPriceCalculator,
    };

    this.leafBuilders = {
      LeafBuilder,
      OptionsPriceLeavesBuilder,
    };

    this.CryptoComparePriceMultiFetcher = CryptoComparePriceMultiFetcher;
  }

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
          .map((input) => this.calculateFeed(ticker, values[inputIndexByHash[hash(input.fetcher)]], keyValueMap, input.calculator)).flat();

        if (feedValues.length) {
          // calculateFeed is allowed to return different keys
          const groups = this.groupInputs(feedValues);
          for (const key in groups) {
            const value = this.calculateMean(groups[key], key, feed.precision);
            keyValueMap[key] = value;
            leaves.push(this.buildLeaf(key, keyValueMap[key] = value));
          }
        } else {
          ignoredMap[ticker] = true;
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

  async processFeed(feedFetcher: FeedFetcher, timestamp: number): Promise<any> {
    const fetcher = this.fetchers[`${feedFetcher.name}Fetcher`];

    if (!fetcher) {
      this.logger.warn(`No fetcher specified for ${feedFetcher.name}`);
      return;
    }

    try {
      return await fetcher.apply(feedFetcher.params, timestamp) || undefined;
    } catch (err) {
      this.logger.warn(`Ignored feed fetcher ${JSON.stringify(feedFetcher)} due to an error.`, err);
      return;
    }
  }

  calculateFeed(key: string, value: any, prices: {[key: string]: number}, feedCalculator?: FeedCalculator): FeedOutput[] {
    if (!value) {
      return [];
    }

    const calculator: Calculator = this.calculators[`${feedCalculator?.name || 'Identity'}Calculator`];

    return calculator.apply(key, value, feedCalculator?.params, prices);
  }

  async processFeeds(feedFetchers: FeedFetcher[], timestamp: number): Promise<any[]> {
    return Promise.all(feedFetchers.map((input) => this.processFeed(input, timestamp)));
  }

  async processMultiFeeds(feedFetchers: FeedFetcher[]): Promise<(any)[]> {
    if (!feedFetchers.length) {
      return [];
    }

    const params = this.createComparePriceMultiParams(feedFetchers);

    let values: CryptoComparePriceMultiFetcherOutputValue[];
    try {
      values = await this.CryptoComparePriceMultiFetcher.apply(params);
    } catch (err) {
      this.logger.warn(`Ignored CryptoComparePriceMulti feed with ${JSON.stringify(params)} due to an error.`, err);
      return [];
    }

    return this.orderCryptoComparePriceMultiOutput(feedFetchers, values);
  }

  private buildLeaf = (label: string, value: number): Leaf => {
    return {
      label,
      valueBytes: `0x${LeafValueCoder.encode(value, label).toString('hex')}`,
    };
  };

  private calculateMean(values: number[], leafLabel: string, precision: number): number {
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

  private groupInputs(outputs: FeedOutput[]) {
    const result: {[key: string]: number[]} = {};

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
