import Leaf from '../types/Leaf.js';
import {DeviationFeeds, DeviationFeed, PriceData, PriceDataByKey} from '../types/DeviationFeeds.js';

export class PriceDataFactory {
  static create(dataTimestamp: number, leaf: Leaf, feed: DeviationFeed): PriceData {
    return <PriceData>{
      data: 0,
      price: BigInt(leaf.valueBytes) / 10_000_000_000n,
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
