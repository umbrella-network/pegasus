import {inject, injectable} from 'inversify';

import Feeds from '../../types/Feed.js';
import {DeviationTriggerLastIntervals} from '../../repositories/DeviationTriggerLastIntervals.js';
import {DeviationFeeds} from '../../types/DeviationFeeds.js';
import {DeviationFeedFactory} from '../../factories/DeviationFeedFactory.js';

@injectable()
export class IntervalTriggerFilter {
  @inject(DeviationTriggerLastIntervals) deviationTriggerLastIntervals!: DeviationTriggerLastIntervals;

  async apply(dataTimestamp: number, feeds: Feeds): Promise<DeviationFeeds> {
    const lastIntervals = await this.deviationTriggerLastIntervals.get();
    const filteredFeeds: DeviationFeeds = {};

    Object.keys(feeds)
      .filter((feedKey) => {
        const {interval} = feeds[feedKey];

        if (!lastIntervals[feedKey] || !interval) {
          return true;
        }

        return dataTimestamp - lastIntervals[feedKey] >= interval;
      })
      .forEach((feedKey) => {
        filteredFeeds[feedKey] = DeviationFeedFactory.create(feedKey, feeds[feedKey]);
      });

    return filteredFeeds;
  }
}
