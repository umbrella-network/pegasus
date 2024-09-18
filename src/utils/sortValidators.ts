import {Validator} from '../types/Validator.js';

export function sortValidators(validators: Validator[]): Validator[] {
  return validators.sort((a, b) => (a.id.toLowerCase() < b.id.toLowerCase() ? -1 : 1));
}
