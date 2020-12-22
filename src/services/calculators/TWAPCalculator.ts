import {injectable} from 'inversify';
import {price} from "@umb-network/validator";

@injectable()
class TWAPCalculator {
  apply(value: [price.BarPrice, unknown][]): number {
    return price.timeWeightedAveragePrice(value.map(([barPrice]) => barPrice));
  }
}

export default TWAPCalculator;
