import {injectable} from 'inversify';
import {price} from "@umb-network/validator";

@injectable()
class VWAPCalculator {
  apply(value: [price.BarPrice, number][]): number {
    return price.volumeWeightedAveragePrice(value);
  }
}

export default VWAPCalculator;
