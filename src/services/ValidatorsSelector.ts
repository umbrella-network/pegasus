import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {Validator} from '../types/Validator.js';
import CachedValidator from '../models/CachedValidator.js';
import {sortValidators} from '../utils/sortValidators.js';

@injectable()
export class ValidatorsSelector {
  @inject('Logger') logger!: Logger;

  private logPrefix = '[ValidatorsSelector]';

  async apply(evmValidators: Record<string, Validator>, validators: CachedValidator[]): Promise<Validator[]> {
    const counter: Record<string, number> = {};

    validators.forEach((data: CachedValidator) => {
      const location = this.processLocation(data.location);
      counter[location] = (counter[location] ?? 0) + 1;
    });

    const maxCount = Math.max(...Object.values(counter));
    console.log(maxCount);
    console.log(counter);

    const selectedValidators = Object.entries(counter)
      .filter(([, count]) => {
        return count == maxCount;
      })
      .map(([location]) => {
        return evmValidators[location];
      })
      .filter((v) => !!v);

    console.log(selectedValidators);

    this.logger.debug(
      `${this.logPrefix} selectedValidators (${selectedValidators.length}): ${JSON.stringify(selectedValidators)}`,
    );

    return sortValidators(selectedValidators);
  }

  private processLocation(url: string): string {
    const noSlash = url.endsWith('/') ? url.slice(0, -1) : url;
    return noSlash.toLowerCase();
  }
}
