import {Validator} from '../types/Validator.js';

export interface StakingBankInterface {
  address(): Promise<string>;
  chainId(): string;
  balanceOf(validator: string): Promise<bigint>;
  verifyValidators(validators: string[]): Promise<boolean>;
  resolveValidators(): Promise<Validator[]>;
  getNumberOfValidators(): Promise<number>;
}
