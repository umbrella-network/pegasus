import {inject, injectable} from 'inversify';
import {price} from '@umb-network/validator';
import {MD5 as hash} from 'object-hash';
import {Logger} from 'winston';
import {LeafValueCoder} from '@umb-network/toolbox';
import Feeds, {FeedValue} from '@umb-network/toolbox/dist/types/Feed';

import Leaf from '../types/Leaf';
import * as fetchers from './fetchers';
import * as calculators from './calculators';
import {FeedInput} from '../types/Feed';
import {
  InputParams as CryptoComparePriceMultiFetcherParams,
  OutputValue as CryptoComparePriceMultiFetcherOutputValue,
} from './fetchers/CryptoComparePriceMultiFetcher';

interface Fetcher {
  // eslint-disable-next-line
  apply: (feed: any, timestamp: number) => Promise<any>;
}

// eslint-disable-next-line
type Calculator = (value: any) => number;

@injectable()
class FeedProcessor {
  @inject('Logger') logger!: Logger;

  fetchers: {[key: string]: Fetcher};
  calculators: {[key: string]: Calculator};

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
    @inject(fetchers.OptionsPriceFetcher) OptionsPriceFetcher: fetchers.OptionsPriceFetcher,
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
      OptionsPriceFetcher,
    };

    this.calculators = Object.keys(calculators).reduce(
      (map, name, idx) => ({
        ...map,
        [name]: Object.values(calculators)[idx],
      }),
      {} as {[key: string]: Calculator},
    );

    this.CryptoComparePriceMultiFetcher = CryptoComparePriceMultiFetcher;
  }

  async apply(timestamp: number, ...feedsArray: Feeds[]): Promise<Leaf[][]> {
    // collect unique inputs
    const uniqueInputsMap: {[hash: string]: FeedInput} = {};

    feedsArray.forEach((feeds) => {
      const keys = Object.keys(feeds);
      keys.forEach((leafLabel) =>
        feeds[leafLabel].inputs.forEach((input) => {
          uniqueInputsMap[hash(input)] = input;
        }),
      );
    });

    const {singleInputs, multiInputs} = this.separateInputs(uniqueInputsMap);
    const inputIndexByHash: {[hash: string]: number} = {};

    Object.keys(singleInputs).forEach((hash, index) => {
      inputIndexByHash[hash] = index;
    });

    Object.keys(multiInputs).forEach((hash, index) => {
      const singleInputsLength = Object.values(singleInputs).length;
      inputIndexByHash[hash] = index + singleInputsLength;
    });

    const [singleFeeds, multiFeeds, optionPricesFeeds] = await Promise.all([
      this.processFeeds(Object.values(singleInputs), timestamp),
      this.processMultiFeeds(Object.values(multiInputs)),
      this.fetchOptionPrices(),
    ]);

    const values = [...singleFeeds, ...multiFeeds];
    const result: Leaf[][] = [];
    const ignoredMap: {[string: string]: boolean} = {};

    feedsArray.forEach((feeds, iteration) => {
      const tickers = Object.keys(feeds);
      const leaves: Leaf[] = [];

      tickers.forEach((ticker) => {
        if (ticker === 'OPTIONS') return;

        const feed = feeds[ticker];

        const feedValues = feed.inputs
          .map((input) => values[inputIndexByHash[hash(input)]])
          .filter((item) => item !== undefined) as number[];

        if (feedValues.length) {
          leaves.push(this.calculateMean(feedValues, ticker, feed.precision));
        } else {
          ignoredMap[ticker] = true;
        }
      });

      if (this.isOnSecondIteration(iteration)) {
        const optionPricesLeaves = this.buildOptionPricesLeaves(optionPricesFeeds, feeds.OPTIONS.precision);
        optionPricesLeaves.forEach((leaf) => leaves.push(leaf));
      }

      result.push(leaves);
    });

    const ignored = Object.keys(ignoredMap);

    if (ignored.length) {
      ////// this.logger.warn(`Ignored: ${JSON.stringify(ignored)}`);
    }

    return result;
  }

  async processFeed(feedInput: FeedInput, timestamp: number): Promise<FeedValue | undefined> {
    const fetcher = this.fetchers[`${feedInput.fetcher.name}Fetcher`];

    if (!fetcher) {
      this.logger.warn(`No fetcher specified for ${feedInput.fetcher.name}`);
      return;
    }

    const calculate: Calculator = this.calculators[`calculate${feedInput.calculator?.name || 'Identity'}`];

    let value;
    try {
      value = await fetcher.apply(feedInput.fetcher.params, timestamp);
    } catch (err) {
      this.logger.warn(`Ignored feed ${JSON.stringify(feedInput)} due to an error.`, err);
      return;
    }

    if (value) {
      return calculate(value);
    }

    return;
  }

  async processFeeds(feedInputs: FeedInput[], timestamp: number): Promise<(FeedValue | undefined)[]> {
    return Promise.all(feedInputs.map((input) => this.processFeed(input, timestamp)));
  }

  async processMultiFeeds(feedInputs: FeedInput[]): Promise<(number | undefined)[]> {
    if (!feedInputs.length) {
      return [];
    }

    const params = this.createComparePriceMultiParams(feedInputs);

    let values: CryptoComparePriceMultiFetcherOutputValue[];
    try {
      values = await this.CryptoComparePriceMultiFetcher.apply(params);
    } catch (err) {
      this.logger.warn(`Ignored CryptoComparePriceMulti feed with ${JSON.stringify(params)} due to an error.`, err);
      return [];
    }

    return this.orderCryptoComparePriceMultiOutput(feedInputs, values);
  }

  async fetchOptionPrices(): Promise<{[key: string]: number}> {
    return this.fetchers.OptionsPriceFetcher.apply({}, 0);
  }

  /**
   * Checks if loop is on Layer 2 Data iteration. The first iteration
   * is for First Class Data
   * @param iteration 
   * @returns boolean
   */
  private isOnSecondIteration(iteration: number): boolean {
    return iteration === 1;
  }

  private buildOptionPricesLeaves(optionPrices: {[key: string]: number}, precision: number): Leaf[] {
    return Object.entries(optionPrices).map(([key, value]) => this.calculateMean([value], key, precision));
  }

  private buildLeaf = (label: string, value: number): Leaf => {
    return {
      label,
      valueBytes: `0x${LeafValueCoder.encode(value, label).toString('hex')}`,
    };
  };

  private calculateMean(values: number[], leafLabel: string, precision: number): Leaf {
    const multi = Math.pow(10, precision);

    const result = Math.round(price.mean(values) * multi) / multi;

    return this.buildLeaf(leafLabel, result);
  }

  /**
   * Separates inputs that belong to CryptoComparePriceMulti and others
   */
  private separateInputs(uniqueInputsMap: {[hash: string]: FeedInput}) {
    const inputMapArr = Object.values(uniqueInputsMap);
    const inputKeys = Object.keys(uniqueInputsMap);

    const separatedInputs: {
      singleInputs: {[hash: string]: FeedInput};
      multiInputs: {[hash: string]: FeedInput};
    } = {
      singleInputs: {},
      multiInputs: {},
    };

    inputMapArr.forEach((input: FeedInput, index) => {
      if (input.fetcher.name === 'CryptoComparePrice') {
        separatedInputs.multiInputs[inputKeys[index]] = input;
      } else {
        separatedInputs.singleInputs[inputKeys[index]] = input;
      }
    });

    return separatedInputs;
  }

  /**
   * Filters CryptoComparePriceMulti outputs based on CryptoComparePrice inputs
   */
  private orderCryptoComparePriceMultiOutput(
    feedInputs: FeedInput[],
    values: CryptoComparePriceMultiFetcherOutputValue[],
  ): (number | undefined)[] {
    const inputsIndexMap: {[key: string]: number} = {};
    feedInputs.forEach(({fetcher: {params}}, index) => {
      const {fsym, tsyms} = params as never;
      inputsIndexMap[`${fsym}:${tsyms}`] = index;
    });

    const result: (number | undefined)[] = [];
    result.length = feedInputs.length;

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
  private createComparePriceMultiParams(feedInputs: FeedInput[]): CryptoComparePriceMultiFetcherParams {
    const fsymSet = new Set<string>(),
      tsymSet = new Set<string>();

    feedInputs.forEach(({fetcher}) => {
      const {fsym, tsyms} = fetcher.params as never;

      fsymSet.add(fsym);
      tsymSet.add(tsyms);
    });

    return {
      fsyms: [...fsymSet],
      tsyms: [...tsymSet],
    };
  }
}

export default FeedProcessor;
