import * as calculators from '../services/calculators/index.js';
import {Vault} from '../services/fetchers/YearnVaultTokenPriceFetcher';
import {OptionsEntries} from '../services/fetchers/OptionsPriceFetcher.js';
import {FeedOutput} from './Feed.js';

export enum CalculatorName {
  YEARN_TRANSFORM_PRICE = 'YearnTransformPrice',
  OPTIONS_PRICE = 'OptionsPrice',
  IDENTITY = 'Identity',
  TWAP = 'TWAP',
  VWAP = 'VWAP',
}

export type CalculatorValueType =
  | calculators.TWAPCalculatorValueType[]
  | calculators.IdentityCalculatorAnyValueType
  | calculators.VWAPCalculatorValueType[]
  | Vault[]
  | OptionsEntries;

export interface CalculatorInterface {
  // eslint-disable-next-line
  apply: (key: string, value: CalculatorValueType, params: any, ...args: any[]) => FeedOutput[];
}
