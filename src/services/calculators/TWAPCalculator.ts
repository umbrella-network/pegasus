import {injectable} from 'inversify';
import {price} from '@umb-network/validator';

import {FeedOutput} from '../../types/Feed.js';

@injectable()
class TWAPCalculator {
  apply(key: string, value: [price.BarPrice, unknown][]): FeedOutput[] {
    return [{key, value: price.timeWeightedAveragePrice(value.map(([barPrice]) => barPrice))}];
  }
}

export default TWAPCalculator;
