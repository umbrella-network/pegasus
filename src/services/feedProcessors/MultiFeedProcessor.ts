import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ByBitSpotFetcher, BinancePriceMultiFetcher, CoingeckoPriceMultiFetcher} from '../fetchers/index.js';

import UniswapV3MultiFetcher, {
  UniswapV3MultiFetcherParams as InputParamsUniswapV3,
} from '../dexes/uniswapV3/UniswapV3MultiFetcher.js';

import {SovrynPriceFetcher, PairRequest as InputParamsSovryn} from '../dexes/sovryn/SovrynPriceFetcher.js';

import {FeedFetcher} from '../../types/Feed.js';
import {FetcherName, StringOrUndefined} from '../../types/fetchers.js';
import {InputParams as InputParamsByBit} from '../fetchers/ByBitSpotFetcher.js';
import {InputParams as InputParamsBinance} from '../fetchers/BinancePriceMultiFetcher.js';
import {InputParams as InputParamsCoingecko} from '../fetchers/CoingeckoPriceMultiFetcher.js';

@injectable()
export default class MultiFeedProcessorNew {
  @inject(CoingeckoPriceMultiFetcher) coingeckoPriceFetcher!: CoingeckoPriceMultiFetcher;
  @inject(BinancePriceMultiFetcher) binancePriceFetcher!: BinancePriceMultiFetcher;
  @inject(ByBitSpotFetcher) byBitSpotPriceFetcher!: ByBitSpotFetcher;
  @inject(SovrynPriceFetcher) sovrynPriceFetcher!: SovrynPriceFetcher;
  @inject(UniswapV3MultiFetcher) uniswapV3PriceFetcher!: UniswapV3MultiFetcher;
  @inject('Logger') logger!: Logger;

  async apply(feedFetchers: FeedFetcher[]): Promise<unknown[]> {
    if (!feedFetchers.length) return [];

    this.logger.debug(`[MultiFeedProcessorNew] feedFetchers ${JSON.stringify(feedFetchers)}`);

    const promiseMap = {
      [FetcherName.BY_BIT]: () =>
        this.byBitSpotPriceFetcher.apply(this.getInputs<InputParamsByBit>(feedFetchers, FetcherName.BY_BIT)),
      [FetcherName.BINANCE]: () =>
        this.binancePriceFetcher.apply(this.getInputs<InputParamsBinance>(feedFetchers, FetcherName.BINANCE)),
      [FetcherName.COINGECKO_PRICE]: () =>
        this.coingeckoPriceFetcher.apply(
          this.getInputs<InputParamsCoingecko>(feedFetchers, FetcherName.COINGECKO_PRICE),
          {symbols: this.getSymbols(feedFetchers, FetcherName.COINGECKO_PRICE)},
        ),
      [FetcherName.UNISWAP_V3]: () =>
        this.uniswapV3PriceFetcher.apply(this.getInputs<InputParamsUniswapV3>(feedFetchers, FetcherName.UNISWAP_V3), {
          symbols: this.getSymbols(feedFetchers, FetcherName.UNISWAP_V3),
        }),
      [FetcherName.SOVRYN_PRICE]: () =>
        this.sovrynPriceFetcher.apply(this.getInputs<InputParamsSovryn>(feedFetchers, FetcherName.SOVRYN_PRICE), {
          symbols: this.getSymbols(feedFetchers, FetcherName.SOVRYN_PRICE),
        }),
    };

    const promises = Object.values(promiseMap).map((fn) => fn());
    const classNames = Object.keys(promiseMap);

    const promisesResults = await Promise.allSettled(promises);

    let response: unknown[] = [];

    promisesResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        response = response.concat(result.value.prices);
        this.logger.debug(`[MultiFeedProcessor] fulfilled ${classNames[i]}: ${JSON.stringify(result.value)}`);
      } else {
        this.logger.warn(`[MultiFeedProcessor] Ignored ${classNames[i]}. Reason: ${result.reason}`);
      }
    });

    return response;
  }

  private getInputs<T>(feedFetchers: FeedFetcher[], fetcherName: FetcherName): T[] {
    return feedFetchers.filter((fetcher) => fetcher.name === fetcherName).map((fetcher) => fetcher.params as T);
  }

  private getSymbols(feedFetchers: FeedFetcher[], fetcherName: FetcherName): StringOrUndefined[] {
    return feedFetchers.filter((fetcher) => fetcher.name === fetcherName).map((fetcher) => fetcher.symbol);
  }
}
