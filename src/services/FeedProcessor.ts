import {inject, injectable} from 'inversify';
import {v4 as uuid} from 'uuid';
import {price} from "@umb-network/validator";


import Leaf from './../models/Leaf';

import * as fetchers from './fetchers';
import * as calculators from './calculators';
import Feeds, {FeedInput} from '../types/Feed';
import {Logger} from 'winston';
import { LeafType, LeafValueCoder } from '@umb-network/toolbox';

interface Fetcher {
  // eslint-disable-next-line
  apply: (feed: any) => Promise<any>;
}

// eslint-disable-next-line
type Calculator = (value: any) => number;

@injectable()
class FeedProcessor {
  @inject('Logger') logger!: Logger;

  fetchers: { [key: string]: Fetcher; };
  calculators: { [key: string]: Calculator; };

  constructor(
    @inject(fetchers.CryptoCompareHistoHourFetcher) CryptoCompareHistoHourFetcher: fetchers.CryptoCompareHistoHourFetcher,
    @inject(fetchers.CryptoCompareHistoDayFetcher) CryptoCompareHistoDayFetcher: fetchers.CryptoCompareHistoDayFetcher,
    @inject(fetchers.CryptoComparePriceFetcher) CryptoComparePriceFetcher: fetchers.CryptoComparePriceFetcher,
    @inject(fetchers.GVolImpliedVolatilityFetcher) GVolImpliedVolatilityFetcher: fetchers.GVolImpliedVolatilityFetcher,
    @inject(fetchers.PolygonIOPriceFetcher) PolygonIOPriceFetcher: fetchers.PolygonIOPriceFetcher,
    @inject(fetchers.CryptoComparePriceWSFetcher) CryptoComparePriceWSFetcher: fetchers.CryptoComparePriceWSFetcher,
  ) {
    this.fetchers = {
      CryptoComparePriceFetcher,
      CryptoCompareHistoHourFetcher,
      GVolImpliedVolatilityFetcher,
      CryptoCompareHistoDayFetcher,
      PolygonIOPriceFetcher,
      CryptoComparePriceWSFetcher,
    };

    this.calculators = Object.keys(calculators).reduce((map, name, idx) => ({
      ...map,
      [name]: Object.values(calculators)[idx],
    }), {} as { [key: string]: Calculator; });
  }

  async apply(feeds: Feeds): Promise<Leaf[]> {
    const leaves = (await Promise.all(
      Object.keys(feeds).map((leafLabel) => feeds[leafLabel].inputs.map((it) =>
        this.processFeed(leafLabel, it))).flat())).flat();

    return this.groupLeavesWithMedian(leaves, feeds);
  }

  async processFeed(leafLabel: string, feedInput: FeedInput): Promise<Leaf[]> {
    const leaf = this.buildLeaf(leafLabel)

    const fetcher = this.fetchers[`${feedInput.fetcher.name}Fetcher`];
    if (!fetcher) {
      throw new Error(`No fetcher specified for [${leafLabel}]`)
    }

    const calculate: Calculator = this.calculators[`calculate${feedInput.calculator?.name || 'Identity'}`];

    let value;
    try {
      value = await fetcher.apply(feedInput.fetcher.params);
    } catch (err) {
      this.logger.warn(`Ignored feed [${leafLabel}] due to an error.`, err);
      return [];
    }

    if (value) {
      const numericValue = calculate(value);
      leaf.valueBuffer = LeafValueCoder.encode(numericValue, LeafType.TYPE_FLOAT)
      return [leaf];
    } else {
      return [];
    }
  }

  private buildLeaf = (leafLabel: string): Leaf => {
    const leaf = new Leaf();
    leaf._id = uuid();
    leaf.timestamp = new Date();
    leaf.label = leafLabel;
    return leaf;
  }

  private groupLeavesWithMedian(leaves: Leaf[], feeds: Feeds): Leaf[] {
    const groupedLeaves = leaves.reduce(function (res, leaf) {
      (res[leaf.label] = res[leaf.label] || []).push(leaf);
      return res;
    }, {} as { [key: string]: Leaf[]; });

    return Object.values(groupedLeaves).map((leaves) => {
      const precision = feeds[leaves[0].label].precision;
      const multi = Math.pow(10, precision);
      const priceMedian = Math.round(price.median(leaves.map(({valueBuffer}) => LeafValueCoder.decode(valueBuffer.toString('hex')) as number)) * multi) / multi

      return {
        ...leaves[0],
        valueBuffer: LeafValueCoder.encode(priceMedian, LeafType.TYPE_FLOAT),
      };
    });
  }
}

export default FeedProcessor;
