import {injectable} from 'inversify';
import {price} from '@umb-network/validator';

import {FeedOutput} from '../../types/Feed.js';
import {CalculatorInterface, CalculatorValueType} from '../../types/CalculatorInterface.js';

export type TWAPCalculatorValueType = [price.BarPrice, unknown];

@injectable()
class TWAPCalculator implements CalculatorInterface {
  apply(key: string, value: CalculatorValueType): FeedOutput[] {
    return [
      {
        key,
        feedPrice: {
          value: price.timeWeightedAveragePrice((value as TWAPCalculatorValueType[]).map(([barPrice]) => barPrice)),
        },
      },
    ];
  }
}

export default TWAPCalculator;
