import {injectable} from 'inversify';
import {price} from '@umb-network/validator';

import {FeedOutput} from '../../types/Feed';

@injectable()
class VWAPCalculator {
  apply(key: string, value: [price.BarPrice, number][]): FeedOutput[] {
    return [{key, value: price.volumeWeightedAveragePriceWithBars(value)}];
  }
}

export default VWAPCalculator;
