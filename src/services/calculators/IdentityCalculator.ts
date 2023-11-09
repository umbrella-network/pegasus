import {injectable} from 'inversify';
import {FeedOutput} from '../../types/Feed.js';

@injectable()
class IdentityCalculator {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply(feedKey: string, feedValue: any): FeedOutput[] {
    if (!feedValue) {
      return [];
    } else if (Array.isArray(feedValue)) {
      return feedValue.map(({key, value}) => ({key: feedKey.replace('*', key), value}));
    } else if (typeof feedValue === 'object') {
      const {key, value} = feedValue;
      return [{key: feedKey.replace('*', key), value}];
    } else {
      return [{key: feedKey, value: feedValue}];
    }
  }
}

export default IdentityCalculator;
