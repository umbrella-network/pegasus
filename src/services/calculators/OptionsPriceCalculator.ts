import {injectable} from 'inversify';

import {FeedOutput} from '../../types/Feed';
import {OptionsEntries} from '../fetchers/OptionsPriceFetcher';

@injectable()
class OptionsPriceCalculator {
  apply(key: string, values: OptionsEntries, params: any): FeedOutput[] {
    const {sym} = params;

    const prefix = `${sym}-`;

    const result: FeedOutput[] = [];

    for (const key in values) {
      if (!key.startsWith(prefix)) {
        continue;
      }

      const {callPrice, iv, putPrice} = values[key];

      const outputKey = key.replace('*', key.substr(prefix.length));

      result.push({key: `${outputKey}_call_price`, value: callPrice});
      result.push({key: `${outputKey}_iv_price`, value: iv});
      result.push({key: `${outputKey}_put_price`, value: putPrice});
    }

    return Object.values(result);
  }
}

export default OptionsPriceCalculator;
