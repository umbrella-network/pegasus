import {inject, injectable} from 'inversify';
import {FeedOutput} from '../types/Feed.js';
import * as calculators from '../services/calculators/index.js';

interface Calculator {
  // eslint-disable-next-line
  apply: (key: string, value: any, params: any, ...args: any[]) => FeedOutput[];
}

@injectable()
export class CalculatorRepository {
  readonly collection: {[key: string]: Calculator};

  constructor(
    @inject(calculators.TWAPCalculator) TWAP: calculators.TWAPCalculator,
    @inject(calculators.IdentityCalculator) Identity: calculators.IdentityCalculator,
    @inject(calculators.VWAPCalculator) VWAP: calculators.VWAPCalculator,
    @inject(calculators.YearnTransformPriceCalculator)
    YearnTransformPrice: calculators.YearnTransformPriceCalculator,
    @inject(calculators.OptionsPriceCalculator) OptionsPrice: calculators.OptionsPriceCalculator,
  ) {
    this.collection = {
      TWAP,
      Identity,
      VWAP,
      YearnTransformPrice,
      OptionsPrice,
    };
  }

  find(id: string): Calculator | undefined {
    return this.collection[id];
  }

  all(): Calculator[] {
    return Object.values(this.collection);
  }
}
