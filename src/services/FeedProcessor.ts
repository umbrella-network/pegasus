import {inject, injectable} from 'inversify';
import {v4 as uuid} from 'uuid';
import {price} from '@umb-network/validator';
import {MD5 as hash} from 'object-hash';
import {Logger} from 'winston';
import {LeafValueCoder} from '@umb-network/toolbox';

import Leaf from './../models/Leaf';
import * as fetchers from './fetchers';
import * as calculators from './calculators';
import Feeds, {FeedInput, FeedCalculator} from '../types/Feed';

export interface MultiFeedFetcher {
  name: string;
  params: {
    fsym: (string | number)[];
    tsyms: (string | number)[];
  };
}

export interface MultiFeedInput {
  fetcher: MultiFeedFetcher;
  calculator: FeedCalculator;
}

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

  constructor(
    @inject(fetchers.CryptoCompareHistoHourFetcher)
    CryptoCompareHistoHourFetcher: fetchers.CryptoCompareHistoHourFetcher,
    @inject(fetchers.CryptoCompareHistoDayFetcher) CryptoCompareHistoDayFetcher: fetchers.CryptoCompareHistoDayFetcher,
    @inject(fetchers.CryptoComparePriceMultiFetcher)
    CryptoComparePriceMultiFetcher: fetchers.CryptoComparePriceMultiFetcher,
    @inject(fetchers.GVolImpliedVolatilityFetcher) GVolImpliedVolatilityFetcher: fetchers.GVolImpliedVolatilityFetcher,
    @inject(fetchers.PolygonIOPriceFetcher) PolygonIOPriceFetcher: fetchers.PolygonIOPriceFetcher,
    @inject(fetchers.CryptoComparePriceWSFetcher) CryptoComparePriceWSFetcher: fetchers.CryptoComparePriceWSFetcher,
    @inject(fetchers.IEXEnergyFetcher) IEXEnergyFetcher: fetchers.IEXEnergyFetcher,
    @inject(fetchers.CoingeckoPriceFetcher) CoingeckoPriceFetcher: fetchers.CoingeckoPriceFetcher,
    @inject(fetchers.CoinmarketcapPriceFetcher) CoinmarketcapPriceFetcher: fetchers.CoinmarketcapPriceFetcher,
    @inject(fetchers.BEACPIAverageFetcher) BEACPIAverageFetcher: fetchers.BEACPIAverageFetcher,
  ) {
    this.fetchers = {
      CryptoComparePriceMultiFetcher,
      CryptoCompareHistoHourFetcher,
      GVolImpliedVolatilityFetcher,
      CryptoCompareHistoDayFetcher,
      PolygonIOPriceFetcher,
      CryptoComparePriceWSFetcher,
      IEXEnergyFetcher,
      CoingeckoPriceFetcher,
      CoinmarketcapPriceFetcher,
      BEACPIAverageFetcher,
    };

    this.calculators = Object.keys(calculators).reduce(
      (map, name, idx) => ({
        ...map,
        [name]: Object.values(calculators)[idx],
      }),
      {} as {[key: string]: Calculator},
    );
  }

  async apply(timestamp: number, ...feedsArray: Feeds[]): Promise<Leaf[][]> {
    // TODO we don't have to process all keys twice for FCD and leaves,
    // we can do it once for all and then filter out FCD and leaves data
    const uniqueInputsMap: {[hash: string]: FeedInput} = {};

    feedsArray.forEach((feeds) => {
      const keys = Object.keys(feeds);
      keys.forEach((leafLabel) =>
        feeds[leafLabel].inputs.forEach((input) => {
          uniqueInputsMap[hash(input)] = input;
        }),
      );
    });

    const {cryptoCompare, otherInputs} = this.separateInputs(uniqueInputsMap);

    const feedValues = await Promise.all<number | number[] | undefined>([
      this.processMultiFeed(cryptoCompare, timestamp),
      ...Object.values(otherInputs).map((input: any) => this.processFeed(input, timestamp)),
    ]);

    const multiFeed = feedValues[0] as number[];
    const singleFeeds = feedValues.slice(1) as (number | undefined)[];

    const values = [...multiFeed, ...singleFeeds];

    // Hardcoded cryptoCompare to be first, cause I put it first on Promise.all.
    // The current logic requires inputs to not be reordered after them are indexed.
    // I'd try to figure out another strategy like handling objects with prices at processors/fetchers.
    const reorderedInputs = {...cryptoCompare, ...otherInputs};

    const inputIndexByHash: {[hash: string]: number} = {};

    Object.keys(reorderedInputs).forEach((hash, index) => {
      inputIndexByHash[hash] = index;
    });

    const result: Leaf[][] = [];
    const ignoredMap: {[string: string]: boolean} = {};

    feedsArray.forEach((feeds) => {
      const tickers = Object.keys(feeds);
      const leaves: Leaf[] = [];

      tickers.forEach((ticker) => {
        const feed = feeds[ticker];
        const feedValues = feed.inputs
          .map((input) => values[inputIndexByHash[hash(input)]])
          .filter((item) => item !== undefined) as number[];
        if (feedValues.length) {
          leaves.push(this.calculateMedian(feedValues, ticker, feed.precision));
        } else {
          ignoredMap[ticker] = true;
        }
      });

      result.push(leaves);
    });

    const ignored = Object.keys(ignoredMap);
    if (ignored.length) {
      this.logger.warn(`Ignored: ${JSON.stringify(ignored)}`);
    }

    return result;
  }

  private findFetcher(feedInput: FeedInput | MultiFeedInput) {
    const fetcher = this.fetchers[`${feedInput.fetcher.name}Fetcher`];
    if (!fetcher) {
      throw new Error('No fetcher specified.');
    }

    return fetcher;
  }

  async processFeed(feedInput: FeedInput, timestamp: number): Promise<number | undefined> {
    const fetcher = this.findFetcher(feedInput);

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

  async processMultiFeed(feedInputs: FeedInput[], timestamp: number): Promise<number[]> {
    const condensatedFeedInputs = this.condensateMultiInputs(feedInputs);

    if (condensatedFeedInputs === undefined) {
      return [];
    }

    const fetcher = this.findFetcher(condensatedFeedInputs);

    let values;
    try {
      values = await fetcher.apply(condensatedFeedInputs.fetcher.params, timestamp);
      return this.orderInputValues(feedInputs, values);
    } catch (err) {
      this.logger.warn(`Ignored feed ${JSON.stringify(condensatedFeedInputs)} due to an error.`, err);
      return [];
    }
  }

  private orderInputValues(feedInputs: FeedInput[], values: {fsym: string; tsyms: string; value: number}[]): number[] {
    const feedInputValues = Object.values(feedInputs);
    const valuesArr: number[] = [];

    feedInputValues.forEach((input: any) => {
      const foundValue = values.find((value) => {
        return input.fetcher.params.fsym === value.fsym && input.fetcher.params.tsyms === value.tsyms;
      });

      if (foundValue) {
        valuesArr.push(foundValue.value);
      }
    });
    return valuesArr;
  }

  private buildLeaf = (leafLabel: string, leafValue: number): Leaf => {
    const leaf = new Leaf();
    leaf._id = uuid();
    leaf.timestamp = new Date();
    leaf.label = leafLabel;
    leaf.valueBytes = '0x' + LeafValueCoder.encode(leafValue).toString('hex');
    console.log(leafLabel, leaf.valueBytes);
    return leaf;
  };

  private calculateMedian(values: number[], leafLabel: string, precision: number): Leaf {
    const multi = Math.pow(10, precision);
    const priceMedian = Math.round(price.median(values.map((value) => value)) * multi) / multi;

    return this.buildLeaf(leafLabel, priceMedian);
  }

  // CryptoCompare shall fetch many combinations in just one call,
  // so it'll be separated from other inputs.
  private separateInputs(uniqueInputsMap: {[hash: string]: FeedInput}) {
    const inputMapArr = Object.values(uniqueInputsMap);
    const inputKeys = Object.keys(uniqueInputsMap);

    // TODO change reduce to forEach because of speed
    const inputsObj = inputMapArr.reduce(
      // TODO avoid any
      (acc: any, input: FeedInput, index: number) => {
        if (input.fetcher.name === 'CryptoComparePrice') {
          acc.cryptoCompare = {...acc.cryptoCompare, [inputKeys[index]]: input};
        } else {
          acc.otherInputs = {...acc.otherInputs, [inputKeys[index]]: input};
        }

        return acc;
      },
      {
        cryptoCompare: {},
        otherInputs: {},
      }
    );

    return inputsObj;
  }

  // Instead of a single ticker per param, it'll have an array of them.
  private condensateMultiInputs(feedInputs: FeedInput[]): MultiFeedInput | undefined {
    const inputMapArr = Object.values(feedInputs);

    if (inputMapArr.length === 0) {
      return;
    }

    // TODO change reduce to forEach
    const condensatedInput = inputMapArr.reduce(
      // TODO avoid any
      (acc, input: any) => {
        const {fsym, tsyms} = input.fetcher.params;

        !acc.fsym.includes(fsym) && acc.fsym.push(fsym);
        !acc.tsyms.includes(tsyms) && acc.tsyms.push(tsyms);

        return acc;
      },
      {
        fsym: [] as (number | string)[],
        tsyms: [] as (number | string)[],
      },
    );

    const result = inputMapArr[0];

    return {
      ...result,
      fetcher: {
        name: result.fetcher.name + 'Multi',
        params: condensatedInput,
      },
    };
  }
}

export default FeedProcessor;
