import {injectable} from 'inversify';
import {snakeCase} from 'lodash';

import {FeedOutput} from '../../types/Feed';
import {OptionsEntries, OptionsValues} from '../fetchers/OptionsPriceFetcher';

const SIGNED_NUMBER_PREFIX = 'SN_';
const CHAIN_PREFIX_LENGTH = 4;

@injectable()
class OptionsPriceCalculator {
  apply(_: string, values: OptionsEntries, params: {sym: string}): FeedOutput[] {
    const chainSpecificEntries = this.getChainSpecificEntries(values, params.sym);
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
        const param = snakeCase(optionParam);
        result.push({key: `${SIGNED_NUMBER_PREFIX}${key}_${param}`, value: value});
      }
    }

    return result;
  }

  private getKeyWithoutPrefix(key: string): string {
    return key.replace('*', key.substring(CHAIN_PREFIX_LENGTH));
  }
}

export default OptionsPriceCalculator;
