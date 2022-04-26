import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PairWithFreshness} from '../../types/Feed';
import {UniswapPriceService} from '../uniswap/UniswapPriceService';
import {UniswapPoolService} from '../uniswap/UniswapPoolService';

/*
 1st Problem: dynamically detect whether the Uniswap fetcher can be used for a feed file entry based on
 the list of verified pools

 Acceptance:
 * When fetching prices for pools in the feed file
 * And that pool is a verified Uniswap pool
 * Then the Fetcher should use the Uniswap fetcher
 * Even if that fetcher is not in the feed YAML file
*/

/*
  To retrieve Uniswap pool prices irrespective of the component token order

  Acceptance:
  * When fetching prices for a pool
  * And we have a Uniswap verified pool for that specific pool
  * Then we return the price

  * When fetching prices for a pool (BTC-USDT)
  * And we have a Uniswap verified pool for the reverse combination of tokens (USDT-BTC)
  * Then we return the reverse price (BTC-USDT = 1 / USDT-BTC)
*/

/*
  To fetch prices for verified Uniswap pools even if they are not in the feeds file.

  Acceptance:
  * When fetching prices
  * And we have verified Uniswap pools that are not in the feeds file
  * Then we fetch prices for them as if they were in the feeds file
  * And the discrepancy and precision attributes will be statically configured

  Notes:
  * The Uniswap fetcher configuration needs to be fully done via the feeds file
 */

@injectable()
export class UniswapPriceFetcher {
  static readonly DEFAULT_FRESHNESS = 3600;

  @inject('Logger') logger!: Logger;
  @inject(UniswapPoolService) poolService!: UniswapPoolService;
  @inject(UniswapPriceService) priceService!: UniswapPriceService;

  async apply(pair: PairWithFreshness, timestamp: number): Promise<number> {
    const {fsym, tsym} = pair;
    const freshness = pair.freshness || UniswapPriceFetcher.DEFAULT_FRESHNESS;

    try {
      const poolSymbol = this.poolService.getPoolSymbol(fsym, tsym);
      this.logger.debug(`[UniswapPriceFetcher] Retrieving prices for ${poolSymbol} (direct)`);
      const price = await this.priceService.getLatestPrice(poolSymbol, timestamp - freshness, timestamp);
      this.logger.debug(`[UniswapPriceFetcher] Price for ${poolSymbol}: ${price}`);
      if (price) return price;

      const reversePoolSymbol = this.poolService.getPoolSymbol(tsym, fsym);
      this.logger.debug(`[UniswapPriceFetcher] Retrieving prices for ${reversePoolSymbol} (reverse)`);
      const reversePrice = await this.priceService.getLatestPrice(reversePoolSymbol, timestamp - freshness, timestamp);
      this.logger.debug(`[UniswapPriceFetcher] Price for ${reversePoolSymbol}: ${reversePrice}`);
      if (reversePrice) return reversePrice == 0 ? reversePrice : 1 / reversePrice;
    } catch (e) {
      this.logger.error(
        [
          `[UniswapPriceFetcher] Error retrieving prices for ${fsym}-${tsym}`,
          `with freshness ${freshness}`,
          `for timestamp ${timestamp}`,
        ].join(' '),
        e,
      );
    }

    throw new Error(`[UniswapPriceFetcher] NO recent price for ${fsym}-${tsym}`);
  }
}
