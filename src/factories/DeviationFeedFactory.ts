import {Feed} from '../types/Feed';
import {DeviationFeed} from '../types/DeviationFeeds';

export class DeviationFeedFactory {
  static create(feedKey: string, feed: Feed): DeviationFeed {
    if (!feed.heartbeat) throw new Error(`[IntervalTriggerFilter] empty heartbeat for ${feedKey}`);
    if (!feed.trigger) throw new Error(`[IntervalTriggerFilter] empty trigger for ${feedKey}`);

    return <DeviationFeed>{
      ...feed,
      heartbeat: feed.heartbeat,
      trigger: feed.trigger,
      interval: feed.interval || 0,
    };
  }
}
