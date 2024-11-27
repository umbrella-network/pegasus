import {inject, injectable} from 'inversify';
import * as calculators from '../services/calculators/index.js';
import {CalculatorInterface} from '../types/CalculatorInterface.js';

@injectable()
export class CalculatorRepository {
  readonly collection: {[key: string]: CalculatorInterface};

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

  find(id: string): CalculatorInterface | undefined {
    return this.collection[id];
  }

  all(): CalculatorInterface[] {
    return Object.values(this.collection);
  }
}
