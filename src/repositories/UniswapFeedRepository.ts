import {inject, injectable} from 'inversify';
import {Feed} from '../types/Feed';
import {UniswapPoolService} from '../services/uniswap/UniswapPoolService';
import Settings from '../types/Settings';

@injectable()
export class UniswapFeedRepository {
  @inject('Settings') settings!: Settings;
  @inject(UniswapPoolService) uniswapPoolService!: UniswapPoolService;

  async getVerifiedFeeds(): Promise<Feed[]> {
    const collection: Feed[] = [];
    const pools = await this.uniswapPoolService.getVerifiedPools();

    for (const pool of pools) {
      const symbols = [pool.tokens[0].symbol, pool.tokens[1].symbol].map((s) => s.toUpperCase());

      for (const tuple of [symbols, symbols.slice().reverse()]) {
        const symbol = [tuple[0], tuple[1]].join('-');

        const feed: Feed = {
          symbol,
          discrepancy: this.settings.api.uniswap.defaultDiscrepancy,
          precision: this.settings.api.uniswap.defaultPrecision,
          inputs: [
            {
              fetcher: {
                name: 'UniswapPriceFetcher',
                params: {
                  fsym: tuple[0],
                  tsym: tuple[1],
                },
              },
            },
          ],
        };

        if (!this.validate(feed)) continue;

        collection.push(feed);
      }
    }

    return collection;
  }

  private validate(feed: Feed): boolean {
    if (!feed.symbol) return false;

    return !feed.symbol.startsWith('$');
  }
}
