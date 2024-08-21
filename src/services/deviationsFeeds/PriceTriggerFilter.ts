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

    const trigger = this.triggerAmount(priceData.price, deviationFeed.trigger);
    const triggerFired = priceDiff >= trigger;
    let msg = '';

    if (triggerFired) {
      msg = `${leaf.label}: ${priceData.price} =(${percent}%)=> ${newPrice}`;
    } else {
      msg = `${leaf.label}: ${newPrice}, low priceDiff ${priceDiff}@${percent}%:${deviationFeed.trigger}%`;
    }

    return {result: triggerFired, msg};
  }

  protected currentPrice(leaf: Leaf, precision: number): bigint {
    // TODO backwards compatible, remove later
    if (leaf.label == 'PolygonGas-TWAP10-wei' && precision == 9) {
      // this is old config
      precision = 0;
    }

    // price in leaf is 18 decimals, price for deviations is 8 decimals => we need to divide by 1e10
    return BigInt(leaf.valueBytes) / 10n ** (18n - BigInt(precision));
  }

  // price is in 18 decimals
  protected triggerAmount(price: bigint, trigger: number): bigint {
    // first we multiply by 1e8 to not overflow Number, 1e8 it is enough precision for trigger
    // then we normalize percent to desired precision
    // const decimalsDiff;

    const one = 10n ** 18n;
    const diff8 = 10n ** 10n;

    const percent = BigInt(Math.trunc(trigger * 1e8)) * diff8;

    // price * % / 100
    return (price * percent) / (100n * one);
  }

  protected abs(a: bigint): bigint {
    return a < 0n ? -a : a;
  }
}
