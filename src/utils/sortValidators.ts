import {Validator} from '../types/Validator.js';

export function sortValidators(validators: Validator[]): Validator[] {
  return validators.sort((a, b) => (a.id < b.id ? -1 : 1));
}
