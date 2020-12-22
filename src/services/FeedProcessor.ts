import {inject, injectable} from 'inversify';
import {v4 as uuid} from 'uuid';
import {price} from "@umb-network/validator";


import Leaf from './../models/Leaf';
import Feed from './../models/Feed';

import CryptoCompareHistoFetcher from './fetchers/CryptoCompareHistoFetcher';
import CryptoComparePriceFetcher from './fetchers/CryptoComparePriceFetcher';
import IdentityCalculator from './calculators/IdentityCalculator';
import TWAPCalculator from './calculators/TWAPCalculator';
import VWAPCalculator from './calculators/VWAPCalculator';

interface Fetcher {
  // eslint-disable-next-line
  apply: (feed: Feed) => Promise<any>;
}

interface Calculator {
  // eslint-disable-next-line
  apply: (value: any) => number;
}

@injectable()
class FeedProcessor {
  fetchers: { [key: string]: Fetcher; };
  calculators: { [key: string]: Calculator; };

  constructor(
    @inject(IdentityCalculator) IdentityCalculator: IdentityCalculator,
    @inject(TWAPCalculator) TWAPCalculator: TWAPCalculator,
    @inject(VWAPCalculator) VWAPCalculator: VWAPCalculator,
    @inject(CryptoCompareHistoFetcher) CryptoCompareHistoFetcher: CryptoCompareHistoFetcher,
    @inject(CryptoComparePriceFetcher) CryptoComparePriceFetcher: CryptoComparePriceFetcher,
  ) {
    this.fetchers = {
      CryptoComparePriceFetcher,
      CryptoCompareHistoFetcher,
    };
    this.calculators = {
      IdentityCalculator,
      TWAPCalculator,
      VWAPCalculator,
    };
  }

  async apply(feeds: Feed[]): Promise<Leaf[]> {
    const leaves = (await Promise.all(feeds.map((feed) => this.processFeed(feed)))).flat();

    return this.groupLeavesWithMedian(leaves);
  }

  async processFeed(feed: Feed): Promise<Leaf[]> {
    const leaf = this.buildLeaf(feed)

    const fetcher = this.fetchers[feed.fetcher];
    if (!fetcher) {
      throw new Error(`No fetcher specified for [${feed.leafLabel}]`)
    }

    const calculator = this.calculators[feed.calculator || 'IdentityCalculator'];

    let value;
    try {
      value = await fetcher.apply(feed);
    } catch (err) {
      console.warn(`Ignored feed [${feed.leafLabel}] due to an error.`, err);
      return [];
    }

    if (value) {
      leaf.value = calculator.apply(value);
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
