import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PairWithFreshness} from '../../types/Feed.js';
import {UniswapPriceService} from '../uniswap/UniswapPriceService.js';
import {UniswapPoolService} from '../uniswap/UniswapPoolService.js';
import {FeedFetcherInterface, FeedFetcherOptions} from 'src/types/fetchers.js';

@injectable()
export class UniswapPriceFetcher implements FeedFetcherInterface {
  @inject('Logger') logger!: Logger;
  @inject(UniswapPoolService) poolService!: UniswapPoolService;
  @inject(UniswapPriceService) priceService!: UniswapPriceService;

  static readonly DEFAULT_FRESHNESS = 3600;

  async apply(pair: PairWithFreshness, options: FeedFetcherOptions): Promise<number> {
    const {fsym, tsym} = pair;
    const {timestamp} = options;

    if (!timestamp || timestamp <= 0) throw new Error(`invalid timestamp value: ${timestamp}`);

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
