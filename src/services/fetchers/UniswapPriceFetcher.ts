import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PairWithFreshness} from '../../types/Feed.js';
import {UniswapPriceService} from '../uniswap/UniswapPriceService.js';
import {UniswapPoolService} from '../uniswap/UniswapPoolService.js';

@injectable()
export class UniswapPriceFetcher {
  static readonly DEFAULT_FRESHNESS = 3600;

  @inject('Logger') logger!: Logger;
  @inject(UniswapPoolService) poolService!: UniswapPoolService;
  @inject(UniswapPriceService) priceService!: UniswapPriceService;

  async apply(pair: PairWithFreshness, _symbol: string, timestamp: number): Promise<number> {
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
