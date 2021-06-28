import Leaf from '../types/Leaf';
import {Discrepancy} from '../types/Discrepancy';
import Feeds from '../types/Feed';
import {LeafValueCoder} from '@umb-network/toolbox';
import sort from 'fast-sort';
import {calcDiscrepancy} from '../utils/math';
import {ProposedConsensus} from '../types/Consensus';

export class DiscrepancyFinder {
  static apply(
    proposedConsensus: ProposedConsensus,
    fcds: Leaf[],
    leaves: Leaf[],
    fcdsFeeds: Feeds,
    leavesFeeds: Feeds,
  ): Discrepancy[] {
    try {
      const fcdsDisrepancies = this.checkForDiscrepancies(fcds, proposedConsensus.fcds, fcdsFeeds);
      const disrepancies = this.checkForDiscrepancies(leaves, proposedConsensus.leaves, leavesFeeds);

      return disrepancies.concat(fcdsDisrepancies);
    } catch (err) {
      console.error(err);
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

      const proposedValue = LeafValueCoder.decode(proposedValueBytes);
      const value = LeafValueCoder.decode(leaf.valueBytes);
      const {discrepancy} = feeds[leaf.label];

      const diffPerc = calcDiscrepancy(value, proposedValue) * 100.0;

      if (discrepancy < diffPerc) {
        discrepancies.set(label, diffPerc);
      }
    });

    return discrepancies;
  }
}
