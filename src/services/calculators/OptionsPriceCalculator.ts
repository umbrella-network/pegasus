import {injectable} from 'inversify';
import lodash from 'lodash';

import {FeedOutput} from '../../types/Feed.js';
import {OptionsEntries, OptionsValues} from '../fetchers/OptionsPriceFetcher.js';
import {CalculatorInterface, CalculatorValueType} from '../../types/CalculatorInterface.js';

const SIGNED_NUMBER_PREFIX = 'SN_';
const CHAIN_PREFIX_LENGTH = 4;

@injectable()
class OptionsPriceCalculator implements CalculatorInterface {
  apply(_: string, values: CalculatorValueType, params: {sym: string}): FeedOutput[] {
    const chainSpecificEntries = this.getChainSpecificEntries(values as OptionsEntries, params.sym);
    return this.formatOptionsEntries(chainSpecificEntries);
  }

  private getChainSpecificEntries(entries: OptionsEntries, chain: string): [string, OptionsValues][] {
    return Object.entries(entries).filter(([key]) => key.startsWith(chain));
  }

  private formatOptionsEntries(entries: [string, OptionsValues][]): FeedOutput[] {
    const result: FeedOutput[] = [];

    for (const [optionKey, entryValues] of entries) {
      const key = this.getKeyWithoutPrefix(optionKey);
      for (const [optionParam, value] of Object.entries(entryValues)) {
        const param = lodash.snakeCase(optionParam);
        result.push({key: `${SIGNED_NUMBER_PREFIX}${key}_${param}`, feedPrice: {value}});
      }
    }

    return result;
  }

  private getKeyWithoutPrefix(key: string): string {
    return key.replace('*', key.substring(CHAIN_PREFIX_LENGTH));
  }
}

export default OptionsPriceCalculator;
