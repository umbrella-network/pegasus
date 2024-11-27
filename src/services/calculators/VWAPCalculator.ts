import {injectable} from 'inversify';
import {price} from '@umb-network/validator';

import {FeedOutput} from '../../types/Feed.js';
import {CalculatorInterface, CalculatorValueType} from '../../types/CalculatorInterface.js';

export type VWAPCalculatorValueType = [price.BarPrice, number];

@injectable()
class VWAPCalculator implements CalculatorInterface {
  apply(key: string, value: CalculatorValueType): FeedOutput[] {
    return [{key, feedPrice: {value: price.volumeWeightedAveragePriceWithBars(value as VWAPCalculatorValueType[])}}];
  }
}

export default VWAPCalculator;
