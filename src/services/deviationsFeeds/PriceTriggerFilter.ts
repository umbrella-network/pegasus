import {injectable} from 'inversify';

import Leaf from '../../types/Leaf.js';
import {DeviationFeed, FilterResult, PriceData} from '../../types/DeviationFeeds.js';

@injectable()
export class PriceTriggerFilter {
  apply(deviationFeed: DeviationFeed, leaf: Leaf, priceData: PriceData): FilterResult {
    const newPrice = this.currentPrice(leaf, deviationFeed.precision);
    const priceDiff = this.abs(newPrice - priceData.price);
    const percent = Number((priceDiff * 10000n) / priceData.price) / 100;

    if (priceDiff === 0n) {
      return {result: false, msg: `${leaf.label}: flat price`};
    }

    const trigger = this.triggerAmount(priceData.price, deviationFeed.trigger, deviationFeed.precision);
    const triggerFired = priceDiff >= trigger;
    let msg = '';

    if (triggerFired) {
      msg = `${leaf.label}: ${priceData.price} =(${percent}%)=> ${newPrice}`;
    } else {
      msg = `${leaf.label}: low priceDiff ${priceDiff}@${percent}%:${deviationFeed.trigger}%`;
    }

    return {result: triggerFired, msg};
  }

  protected currentPrice(leaf: Leaf, precision: number): bigint {
    // price in leaf is 18 decimals, price for deviations is 8 decimals => we need to divide by 1e10
    return BigInt(leaf.valueBytes) / 10n ** (18n - BigInt(precision));
  }

  protected triggerAmount(price: bigint, trigger: number, precision: number): bigint {
    // first we multiply by 1e8 to not overflow Number, 1e8 it is enough precision for trigger
    // then we normalize percent to desired precision
    const percent = BigInt(Math.trunc(trigger * 1e8)) * 10n ** (18n - BigInt(precision));
    // price * % / 100
    return (price * percent) / 100_00000000n;
  }

  protected abs(a: bigint): bigint {
    return a < 0n ? -a : a;
  }
}
