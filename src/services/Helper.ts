import {inject, injectable} from 'inversify';

import CryptoCompareWSInitializer from './CryptoCompareWSInitializer';
import PriceAggregator from './PriceAggregator';
import TimeService from './TimeService';
import CryptoCompareWSClient from './ws/CryptoCompareWSClient';
import Settings from '../types/Settings';
import sort from 'fast-sort';

@injectable()
class Helper {
  @inject('Settings') settings!: Settings;
  @inject(PriceAggregator) priceAggregator!: PriceAggregator;
  @inject(TimeService) timeService!: TimeService;

  async orderedPriceAggregatorContent(beforeTimestamp: number = this.timeService.apply(), orderBy = 'timestamp') : Promise<{symbol: string; value: number; timestamp: number}[]> {
    const pairs = await CryptoCompareWSInitializer.allPairs(this.settings.feedsOnChain, this.settings.feedsFile);

    const result = await Promise.all(pairs.map(async ({fsym, tsym}) => {
      const valueTimestamp = (await this.priceAggregator.valueTimestamp(`${CryptoCompareWSClient.Prefix}${fsym}~${tsym}`, beforeTimestamp));

      const {value, timestamp} = valueTimestamp || {value: 0, timestamp: 0};

      return {
        symbol: `${fsym}-${tsym}`,
        value,
        timestamp,
      };
    }));

    return sort(result).asc(((item: any) => item[orderBy]));
  }

  async priceAggregatorAllPrices(fsym: string, tsym: string) : Promise<{value: number; timestamp: number}[]> {
    return this.priceAggregator.valueTimestamps(`${CryptoCompareWSClient.Prefix}${fsym}~${tsym}`);
  }
}

export default Helper;
