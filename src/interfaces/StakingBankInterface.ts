import {Validator} from '../types/Validator.js';

export interface StakingBankInterface {
  address(): Promise<string>;
  chainId(): string;
  resolveValidators(): Promise<Validator[]>;
  getNumberOfValidators(): Promise<number>;
}
