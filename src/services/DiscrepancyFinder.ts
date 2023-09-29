import sort from 'fast-sort';
import {LeafValueCoder} from '@umb-network/toolbox';

import Feeds from '../types/Feed';
import {calcDiscrepancy} from '../utils/math';
import {Discrepancy} from '../types/Discrepancy';
import Leaf from '../types/Leaf';

const DEFAULT_DISCREPANCY_VALUE = 1;

export class DiscrepancyFinder {
  static apply(args: {
    proposedFcds: Leaf[];
    proposedLeaves: Leaf[];
    fcds: Leaf[];
    leaves: Leaf[];
    fcdsFeeds: Feeds;
    leavesFeeds: Feeds;
  }): Discrepancy[] {
    try {
      const {proposedFcds, proposedLeaves, fcds, leaves, fcdsFeeds, leavesFeeds} = args;
      const fcdsDiscrepancies = this.checkForDiscrepancies(fcds, proposedFcds, fcdsFeeds);
      const discrepancies = this.checkForDiscrepancies(leaves, proposedLeaves, leavesFeeds);

      return discrepancies.concat(fcdsDiscrepancies);
    } catch (err) {
      console.error(`[DiscrepancyFinder] ${err}`);
      throw err;
    }
  }

  private static checkForDiscrepancies(leaves: Leaf[], proposedLeaves: Leaf[], feeds: Feeds): Discrepancy[] {
    const discrepancies = DiscrepancyFinder.findDiscrepancies(leaves, proposedLeaves, feeds);

    return sort([...discrepancies.entries()])
      .desc(([, value]) => value)
      .map(([key, value]) => {
        return {key, discrepancy: Math.round(value * 100) / 100.0};
      });
  }

  private static findDiscrepancies(leaves: Leaf[], proposedLeaves: Leaf[], feeds: Feeds): Map<string, number> {
    const leafByLabel: {[label: string]: Leaf} = {};

    leaves.forEach((leaf) => {
      leafByLabel[leaf.label] = leaf;
    });

    const discrepancies: Map<string, number> = new Map();

    proposedLeaves.forEach(({valueBytes: proposedValueBytes, label}) => {
      const leaf = leafByLabel[label];
      if (!leaf) {
        // cannot agree on the value that we don't have
        discrepancies.set(label, 100);
        return;
      }

      // compare numeric values with discrepancy
      const discrepancy = DiscrepancyFinder.getDiscrepancy(feeds, leaf);

      // the case when there should be no discrepancy. Simply compare values
      if (discrepancy === 0 || LeafValueCoder.isFixedValue(label)) {
        if (proposedValueBytes !== leaf.valueBytes) {
          discrepancies.set(label, 99);
        }
        return;
      }

      // decode values and compare with discrepancy
      const proposedValue = LeafValueCoder.decode(proposedValueBytes, label);
      const value = LeafValueCoder.decode(leaf.valueBytes, label);

      const diffPerc = calcDiscrepancy(value, proposedValue, label) * 100.0;

      if (discrepancy < diffPerc) {
        discrepancies.set(label, diffPerc);
      }
    });

    return discrepancies;
  }

  private static getDiscrepancy(feeds: Feeds, leaf: Leaf): number {
    const {discrepancy = DEFAULT_DISCREPANCY_VALUE} = feeds[leaf.label] || {};
    if (Number.isInteger(discrepancy)) {
      return discrepancy;
    }

    return discrepancy;
  }
}
