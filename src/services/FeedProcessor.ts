import {inject, injectable} from 'inversify';
import {v4 as uuid} from 'uuid';
import {price} from '@umb-network/validator';
import {MD5 as hash} from 'object-hash';
import {Logger} from 'winston';
import {LeafType, LeafValueCoder} from '@umb-network/toolbox';

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
    @inject(fetchers.CryptoComparePriceFetcher) CryptoComparePriceFetcher: fetchers.CryptoComparePriceFetcher,
    @inject(fetchers.GVolImpliedVolatilityFetcher) GVolImpliedVolatilityFetcher: fetchers.GVolImpliedVolatilityFetcher,
    @inject(fetchers.PolygonIOPriceFetcher) PolygonIOPriceFetcher: fetchers.PolygonIOPriceFetcher,
    @inject(fetchers.CryptoComparePriceWSFetcher) CryptoComparePriceWSFetcher: fetchers.CryptoComparePriceWSFetcher,
    @inject(fetchers.IEXEnergyFetcher) IEXEnergyFetcher: fetchers.IEXEnergyFetcher,
    @inject(fetchers.CoingeckoPriceFetcher) CoingeckoPriceFetcher: fetchers.CoingeckoPriceFetcher,
    @inject(fetchers.CoinmarketcapPriceFetcher) CoinmarketcapPriceFetcher: fetchers.CoinmarketcapPriceFetcher,
  ) {
    this.fetchers = {
      CryptoComparePriceFetcher,
      CryptoCompareHistoHourFetcher,
      GVolImpliedVolatilityFetcher,
      CryptoCompareHistoDayFetcher,
      PolygonIOPriceFetcher,
      CryptoComparePriceWSFetcher,
      IEXEnergyFetcher,
      CoingeckoPriceFetcher,
      CoinmarketcapPriceFetcher,
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
    const uniqueInputsMap: {[hash: string]: FeedInput} = {};
    feedsArray.forEach((feeds) => {
      const keys = Object.keys(feeds);
      keys.forEach((leafLabel) =>
        feeds[leafLabel].inputs.forEach((input) => {
          uniqueInputsMap[hash(input)] = input;
        }),
      );
    });

    const inputIndexByHash: {[hash: string]: number} = {};
    Object.keys(uniqueInputsMap).forEach((hash, index) => {
      inputIndexByHash[hash] = index;
    });

    const values = await Promise.all(Object.values(uniqueInputsMap).map((input) => this.processFeed(input, timestamp)));

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

  private buildLeaf = (leafLabel: string, leafValue: number): Leaf => {
    const leaf = new Leaf();
    leaf._id = uuid();
    leaf.timestamp = new Date();
    leaf.label = leafLabel;
    leaf.valueBytes = '0x' + LeafValueCoder.encode(leafValue, LeafType.TYPE_FLOAT).toString('hex');
    return leaf;
  };

  private calculateMedian(values: number[], leafLabel: string, precision: number): Leaf {
    const multi = Math.pow(10, precision);
    const priceMedian = Math.round(price.median(values.map((value) => value)) * multi) / multi;

    return this.buildLeaf(leafLabel, priceMedian);
  }
}

export default FeedProcessor;
