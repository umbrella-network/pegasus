import {inject, injectable} from 'inversify';
import {v4 as uuid} from 'uuid';
import {price} from '@umb-network/validator';
import {MD5 as hash} from 'object-hash';
import {Logger} from 'winston';
import {LeafValueCoder} from '@umb-network/toolbox';

import Leaf from './../models/Leaf';
import * as fetchers from './fetchers';
import * as calculators from './calculators';
import Feeds, {FeedInput} from '../types/Feed';

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

    const inputIndexByHash: {[hash: string]: number} = {};

    // Hardcoded cryptoCompare to be first, cause I put it first on Promise.all below.
    // The current logic requires inputs to not be reordered after them are indexed.
    // I'd try to figure out another strategy like handling objects with prices at processors/fetchers.
    const reorderedInputs = {...cryptoCompare, ...otherInputs};

    Object.keys(reorderedInputs).forEach((hash, index) => {
      inputIndexByHash[hash] = index;
    });

    const condensatedInput = this.condensateMultiInputs(Object.values(cryptoCompare));

    const feedValues = await Promise.all<number | number[] | undefined>([
      this.processMultiFeed(condensatedInput, timestamp),
      ...Object.values(otherInputs).map((input: any) => this.processFeed(input, timestamp)),
    ]);

    const multiFeed = feedValues[0] as number[];
    const singleFeeds = feedValues.slice(1) as (number | undefined)[];

    const values = [...multiFeed, ...singleFeeds];

    const result: Leaf[][] = [];
    const ignoredMap: {[string: string]: boolean} = {};

    feedsArray.forEach((feeds) => {
      const keys = Object.keys(feeds);
      const leaves: Leaf[] = [];

      keys.forEach((key) => {
        const feed = feeds[key];
        const feedValues = feed.inputs
          .map((input) => values[inputIndexByHash[hash(input)]])
          .filter((item) => item !== undefined) as number[];

        if (feedValues.length) {
          leaves.push(this.calculateMedian(feedValues, key, feed.precision));
        } else {
          ignoredMap[key] = true;
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

  async processFeed(feedInput: FeedInput, timestamp: number): Promise<number | undefined> {
    const fetcher = this.fetchers[`${feedInput.fetcher.name}Fetcher`];
    if (!fetcher) {
      throw new Error('No fetcher specified.');
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

  async processMultiFeed(feedInput: FeedInput | undefined, timestamp: number): Promise<number[]> {
    if (feedInput === undefined) {
      return []
    }

    const fetcher = this.fetchers[`${feedInput.fetcher.name}Fetcher`];
    if (!fetcher) {
      throw new Error('No fetcher specified.');
    }

    const calculate: Calculator = this.calculators[`calculate${feedInput.calculator?.name || 'Identity'}`];

    let values;
    try {
      values = await fetcher.apply(feedInput.fetcher.params, timestamp);
    } catch (err) {
      this.logger.warn(`Ignored feed ${JSON.stringify(feedInput)} due to an error.`, err);
      return [];
    }

    if (values) {
      const v = Object.values(values);
      return v.map(calculate);
    }

    return [];
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

  private separateInputs(uniqueInputsMap: {[hash: string]: FeedInput}) {
    const inputMapArr = Object.values(uniqueInputsMap);
    const inputKeys = Object.keys(uniqueInputsMap);

    const inputsObj = inputMapArr.reduce(
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

  private shouldCondensate(inputMapArr: FeedInput[]) {
    return Boolean(inputMapArr.length);
  }

  private condensateMultiInputs(inputMapArr: FeedInput[]): FeedInput | undefined{
    if (this.shouldCondensate(inputMapArr)) {
      const condensatedInput = inputMapArr.reduce(
        // TODO: Should FeedFetcher.params type be a Record type?
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
    return;
  }
}

export default FeedProcessor;
