import {DeviationDataToSign, DeviationFeeds} from '../types/DeviationFeeds.js';
import Leaf from '../types/Leaf.js';
import {PriceDataFactory} from './PriceDataFactory.js';

export class DeviationDataToSignFactory {
  static create(
    dataTimestamp: number,
    chainsAndKeys: ({chainId: string; keys: string[]} | undefined)[],
    leaves: Record<string, Leaf>,
    feeds: DeviationFeeds,
  ): DeviationDataToSign | undefined {
    const result: DeviationDataToSign = {
      dataTimestamp,
      leaves: {},
      feedsForChain: {},
      proposedPriceData: {},
    };

    let anyDataToSign = false;

    chainsAndKeys.forEach((chainAneKeys) => {
      if (!chainAneKeys) {
        return;
      }

      anyDataToSign = true;

      const {chainId, keys} = chainAneKeys;
      result.feedsForChain[chainId] = keys;

      // we might override same key few times but that's fine
      keys.forEach((key) => {
        result.leaves[key] = leaves[key].valueBytes;
        result.proposedPriceData[key] = PriceDataFactory.create(dataTimestamp, leaves[key], feeds[key]);
      });
    });

    return anyDataToSign ? result : undefined;
  }
}
