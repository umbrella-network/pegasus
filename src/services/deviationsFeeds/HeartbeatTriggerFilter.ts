import {DeviationFeed, PriceData} from '../../types/DeviationFeeds';
import settings from '../../config/settings';

export class HeartbeatTriggerFilter {
  static apply(dataTimestamp: number, feed: DeviationFeed, priceData: PriceData): boolean {
    if (priceData.heartbeat !== feed.heartbeat) {
      return true;
    }

    const {roundLengthSeconds, heartbeatRounds} = settings.deviationTrigger;

    return dataTimestamp - priceData.timestamp >= feed.heartbeat - roundLengthSeconds * heartbeatRounds;
  }
}
