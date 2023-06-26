import axios from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {Validator} from '../types/Validator';

@injectable()
export class ValidatorStatusChecker {
  @inject('Logger') protected logger!: Logger;

  async apply(validator: Validator, timeout: number): Promise<void> {
    const sourceUrl = `${validator.location}/info`;

    const response = await axios.get(sourceUrl, {
      timeoutErrorMessage: `Status check timeout exceeded: ${sourceUrl}`,
      timeout,
    });

    if (response.status !== 200) {
      throw new Error(`Status check failed for validator at ${validator.location}, HTTP: ${response.status}`);
    }

    const data = JSON.stringify(response.data).toLowerCase();
    const indexOf = data.indexOf('error');

    if (indexOf >= 0) {
      const error = data.slice(indexOf, indexOf + 25);
      throw new Error(`Status check failed for validator at ${validator.location}, error detected: ${error}`);
    }
  }
}
