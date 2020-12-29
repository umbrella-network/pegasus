import {inject, injectable} from 'inversify';
import {v4 as uuid} from 'uuid';
import {price} from "@umb-network/validator";


import Leaf from './../models/Leaf';
import Feed from './../models/Feed';

import * as fetchers from './fetchers';
import * as calculators from './calculators';

interface Fetcher {
  // eslint-disable-next-line
  apply: (feed: Feed) => Promise<any>;
}

type Calculator = (value: any) => number;

@injectable()
class FeedProcessor {
  fetchers: { [key: string]: Fetcher; };
  calculators: { [key: string]: Calculator; };

  constructor(
    @inject(fetchers.CryptoCompareHistoFetcher) CryptoCompareHistoFetcher: fetchers.CryptoCompareHistoFetcher,
    @inject(fetchers.CryptoComparePriceFetcher) CryptoComparePriceFetcher: fetchers.CryptoComparePriceFetcher,
  ) {
    this.fetchers = {
      CryptoComparePriceFetcher,
      CryptoCompareHistoFetcher,
    };

    this.calculators = Object.keys(calculators).reduce((map, name, idx) => ({
      ...map,
      [name]: Object.values(calculators)[idx],
    }), {} as { [key: string]: Calculator; });
  }

  async apply(feeds: Feed[]): Promise<Leaf[]> {
    const leaves = (await Promise.all(feeds.map((feed) => this.processFeed(feed)))).flat();

    return this.groupLeavesWithMedian(leaves);
  }

  async processFeed(feed: Feed): Promise<Leaf[]> {
    const leaf = this.buildLeaf(feed)

    const fetcher = this.fetchers[`${feed.fetcher}Fetcher`];
    if (!fetcher) {
      throw new Error(`No fetcher specified for [${feed.leafLabel}]`)
    }

    const calculate: Calculator = this.calculators[`calculate${feed.calculator || 'Identity'}`];

    let value;
    try {
      value = await fetcher.apply(feed);
    } catch (err) {
      console.warn(`Ignored feed [${feed.leafLabel}] due to an error.`, err);
      return [];
    }

    if (value) {
      leaf.value = calculate(value);
      return [leaf];
    } else {
      return [];
    }
  }

  private buildLeaf = (feed: Feed): Leaf => {
    const leaf = new Leaf();
    leaf._id = uuid();
    leaf.timestamp = new Date();
    leaf.label = feed.leafLabel;
    return leaf;
  }

  private groupLeavesWithMedian(leaves: Leaf[]): Leaf[] {
    const groupedLeaves = leaves.reduce(function (res, leaf) {
      (res[leaf.label] = res[leaf.label] || []).push(leaf);
      return res;
    }, {} as { [key: string]: Leaf[]; });

    return Object.values(groupedLeaves).map((leaves) => ({
      ...leaves[0],
      value: Math.round(price.median(leaves.map(({value}) => value)) * 100.0) / 100.0,
    }));
  }
}

export default FeedProcessor;
