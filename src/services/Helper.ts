import {inject, injectable} from 'inversify';

import CryptoCompareWSInitializer from './CryptoCompareWSInitializer';
import PriceAggregator from './PriceAggregator';
import TimeService from './TimeService';
import CryptoCompareWSClient from './ws/CryptoCompareWSClient';
import Settings from '../types/Settings';
import sort from 'fast-sort';
import PolygonIOPriceInitializer from './PolygonIOPriceInitializer';
import PolygonIOPriceService from './PolygonIOPriceService';

@injectable()
class Helper {
  @inject('Settings') settings!: Settings;
  @inject(PriceAggregator) priceAggregator!: PriceAggregator;
  @inject(TimeService) timeService!: TimeService;

  async orderedPriceAggregatorContent(
    beforeTimestamp: number = this.timeService.apply(),
    orderBy = 'timestamp',
  ): Promise<{symbol: string; value: number; timestamp: number}[]> {
    const cryptoPairs = await CryptoCompareWSInitializer.allPairs(this.settings.feedsOnChain, this.settings.feedsFile);
    const stockSymbols = await PolygonIOPriceInitializer.allSymbols(
      this.settings.feedsOnChain,
      this.settings.feedsFile,
    );

    const keys = cryptoPairs
      .map(({fsym, tsym}) => [`${CryptoCompareWSClient.Prefix}${fsym}~${tsym}`, `${fsym}-${tsym}`])
      .concat(stockSymbols.map((sym: string) => [`${PolygonIOPriceService.Prefix}${sym}`, `EQ:${sym}`]));

    const result = await Promise.all(
      keys.map(async ([key, desc]) => {
        const valueTimestamp = await this.priceAggregator.valueTimestamp(key, beforeTimestamp);

        const {value, timestamp} = valueTimestamp || {value: 0, timestamp: 0};

        return {
          symbol: desc,
          value,
          timestamp,
        };
      }),
    );

    return sort(result).asc((item: any) => item[orderBy]);
  }

  async priceAggregatorAllPrices(fsym: string, tsym: string): Promise<{value: number; timestamp: number}[]> {
    return this.priceAggregator.valueTimestamps(`${CryptoCompareWSClient.Prefix}${fsym}~${tsym}`);
  }

  async priceAggregatorStockPrices(sym: string): Promise<{value: number; timestamp: number}[]> {
    return this.priceAggregator.valueTimestamps(`${PolygonIOPriceService.Prefix}${sym}`);
  }
}

export default Helper;
