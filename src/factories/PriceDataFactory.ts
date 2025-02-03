import Leaf from '../types/Leaf.js';
import {DeviationFeed, DeviationFeeds, PriceData, PriceDataByKey} from '../types/DeviationFeeds.js';

export class PriceDataFactory {
  static create(dataTimestamp: number, leaf: Leaf, feed: DeviationFeed): PriceData {
    if (feed === undefined) {
      throw new Error(`[PriceDataFactory] (debug) deviationFeed is undefined for ${leaf.label}`);
    }

    if (feed.precision < 0 || feed.precision > 18) {
      throw new Error(`[PriceDataFactory] invalid precision for ${leaf.label}: ${feed.precision}`);
    }

    const price = BigInt(leaf.valueBytes) / 10n ** BigInt(18 - feed.precision);

    if (price >= 2n ** 128n) {
      throw new Error(`[PriceDataFactory] invalid precision for ${leaf.label}: ${feed.precision}`);
    }

    return <PriceData>{
      data: 0,
      price,
      timestamp: dataTimestamp,
      heartbeat: feed.heartbeat,
    };
  }

  static createMany(dataTimestamp: number, leaves: Leaf[], feeds: DeviationFeeds): PriceDataByKey {
    const priceDataByKey: PriceDataByKey = {};

    leaves.forEach((leaf) => {
      priceDataByKey[leaf.label] = {
        ...PriceDataFactory.create(dataTimestamp, leaf, feeds[leaf.label]),
        key: leaf.label,
      };
    });

    return priceDataByKey;
  }
}
