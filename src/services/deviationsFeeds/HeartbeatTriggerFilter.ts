import {DeviationFeed, PriceData} from '../../types/DeviationFeeds';

export class HeartbeatTriggerFilter {
  static apply(dataTimestamp: number, feed: DeviationFeed, priceData: PriceData): boolean {
    if (priceData.heartbeat !== feed.heartbeat) {
      return true;
    }

    return dataTimestamp - priceData.timestamp >= feed.heartbeat;
  }
}
