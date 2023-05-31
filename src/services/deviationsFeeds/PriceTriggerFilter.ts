import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Leaf from '../../types/Leaf';
import {DeviationFeed, PriceData} from '../../types/DeviationFeeds';

@injectable()
export class PriceTriggerFilter {
  @inject('Logger') logger!: Logger;

  apply(deviationFeed: DeviationFeed, leaf: Leaf, priceData: PriceData): boolean {
    const priceDiff = this.abs(this.currentPrice(leaf) - priceData.price);

    if (priceDiff === 0n) {
      this.logger.info(`[PriceTriggerFilter] ${leaf.label} price is flat`);
      return false;
    }

    const trigger = this.triggerAmount(priceData.price, deviationFeed.trigger);
    const triggerFired = priceDiff >= trigger;

    if (!triggerFired) {
      this.logger.info(`[PriceTriggerFilter] ${leaf.label} priceDiff not triggered ${priceDiff}:${trigger}`);
    }

    return triggerFired;
  }

  protected currentPrice(leaf: Leaf): bigint {
    // price in leaf is 18 decimals, price for deviations is 8 decimals => we need to divide by 1e10
    return BigInt(leaf.valueBytes) / 10n ** 10n;
  }

  protected triggerAmount(price: bigint, trigger: number): bigint {
    const percent = BigInt(Math.trunc(trigger * 1e8));
    // price * % / 100
    return (price * percent) / 100_00000000n;
  }

  protected abs(a: bigint): bigint {
    return a < 0n ? -a : a;
  }
}
