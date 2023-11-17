import {inject, injectable} from 'inversify';

import Feeds from '../../types/Feed.js';
import {DeviationTriggerLastIntervals} from '../../repositories/DeviationTriggerLastIntervals.js';
import {DeviationFeeds} from '../../types/DeviationFeeds.js';
import {DeviationFeedFactory} from '../../factories/DeviationFeedFactory.js';

@injectable()
export class IntervalTriggerFilter {
  @inject(DeviationTriggerLastIntervals) deviationTriggerLastIntervals!: DeviationTriggerLastIntervals;

  async apply(dataTimestamp: number, feeds: Feeds): Promise<{filteredFeeds: DeviationFeeds; rejected?: string}> {
    const lastIntervals = await this.deviationTriggerLastIntervals.get();
    const filteredFeeds: DeviationFeeds = {};
    const rejected: string[] = [];

    Object.keys(feeds)
      .filter((feedKey) => {
        const {interval} = feeds[feedKey];

        if (!lastIntervals[feedKey] || !interval) {
          return true;
        }

        if (dataTimestamp - lastIntervals[feedKey] >= interval) {
          return true;
        } else {
          rejected.push(feedKey);
          return false;
        }
      })
      .forEach((feedKey) => {
        filteredFeeds[feedKey] = DeviationFeedFactory.create(feedKey, feeds[feedKey]);
      });

    return {
      filteredFeeds,
      rejected: rejected.length == 0 ? undefined : rejected.join(','),
    };
  }
}
