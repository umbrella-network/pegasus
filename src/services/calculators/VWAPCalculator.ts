import {injectable} from 'inversify';
import {price} from '@umb-network/validator';

import {FeedOutput} from '../../types/Feed.js';

@injectable()
class VWAPCalculator {
  apply(key: string, value: [price.BarPrice, number][]): FeedOutput[] {
    return [{key, value: price.volumeWeightedAveragePriceWithBars(value)}];
  }
}

export default VWAPCalculator;
