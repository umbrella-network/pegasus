import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {ByBitSpotFetcher, BinancePriceMultiFetcher, CoingeckoPriceMultiFetcher} from '../fetchers/index.js';

import UniswapV3MultiFetcher, {
  UniswapV3MultiFetcherParams as InputParamsUniswapV3,
} from '../dexes/uniswapV3/UniswapV3MultiFetcher.js';

import {SovrynPriceFetcher, PairRequest as InputParamsSovryn} from '../dexes/sovryn/SovrynPriceFetcher.js';

import {FeedFetcher} from '../../types/Feed.js';
import {FetcherName} from '../../types/fetchers.js';
import {InputParams as InputParamsByBit} from '../fetchers/ByBitSpotFetcher.js';
import {InputParams as InputParamsBinance} from '../fetchers/BinancePriceMultiFetcher.js';
import {InputParams as InputParamsCoingecko} from '../fetchers/CoingeckoPriceMultiFetcher.js';
import {PriceDataRepository, PriceDataPayload, PriceValueType} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import FeedSymbolChecker from '../FeedSymbolChecker.js';

@injectable()
export default class MultiFeedProcessorNew {
  @inject(CoingeckoPriceMultiFetcher) coingeckoPriceMultiFetcher!: CoingeckoPriceMultiFetcher;
  @inject(BinancePriceMultiFetcher) binancePriceMultiFetcher!: BinancePriceMultiFetcher;
  @inject(ByBitSpotFetcher) byBitSpotFetcher!: ByBitSpotFetcher;
  @inject(SovrynPriceFetcher) sovrynFetcher!: SovrynPriceFetcher;
  @inject(PriceDataRepository) private priceDataRepository!: PriceDataRepository;
  @inject(FeedSymbolChecker) private feedSymbolChecker!: FeedSymbolChecker;
  @inject(UniswapV3MultiFetcher) uniswapV3MultiFetcher!: UniswapV3MultiFetcher;
  @inject(TimeService) private timeService!: TimeService;
  @inject('Logger') logger!: Logger;

  async apply(feedFetchers: FeedFetcher[]): Promise<unknown[]> {
    if (!feedFetchers.length) return [];

    this.logger.debug(`[MultiFeedProcessorNew] feedFetchers ${JSON.stringify(feedFetchers)}`);

    const promiseMap = {
      [FetcherName.BY_BIT]: () =>
        this.byBitSpotFetcher.apply(this.getInputs<InputParamsByBit>(feedFetchers, FetcherName.BY_BIT)),
      [FetcherName.BINANCE]: () =>
        this.binancePriceMultiFetcher.apply(this.getInputs<InputParamsBinance>(feedFetchers, FetcherName.BINANCE)),
      [FetcherName.COINGECKO_PRICE]: () =>
        this.coingeckoPriceMultiFetcher.apply(
          this.getInputs<InputParamsCoingecko>(feedFetchers, FetcherName.COINGECKO_PRICE),
        ),
      [FetcherName.UNISWAP_V3]: () =>
        this.uniswapV3MultiFetcher.apply(this.getInputs<InputParamsUniswapV3>(feedFetchers, FetcherName.UNISWAP_V3)),
      [FetcherName.SOVRYN_PRICE]: () =>
        this.sovrynFetcher.apply(this.getInputs<InputParamsSovryn>(feedFetchers, FetcherName.SOVRYN_PRICE)),
    };

    const promises = Object.values(promiseMap).map((fn) => fn());
    const classNames = Object.keys(promiseMap);

    const promisesResults = await Promise.allSettled(promises);

    let response: unknown[] = [];
    const payloads: PriceDataPayload[] = [];

    promisesResults.forEach((result, i) => {
      if (result.status === 'fulfilled') {
        const symbols = feedFetchers
          .filter((fetcher) => fetcher.name == classNames[i])
          .map((fetcher) => fetcher.symbol);

        const timestamp = result.value.timestamp || this.timeService.apply();

        for (const [ix, output] of result.value.prices.entries()) {
          if (!output) continue;

          const result = this.feedSymbolChecker.apply(symbols[ix]);
          if (!result) continue;

          const [feedBase, feedQuote] = result;

          payloads.push({
            fetcher: classNames[i],
            value: output.toString(),
            valueType: PriceValueType.Price,
            timestamp,
            feedBase,
            feedQuote,
            fetcherSource: '',
          });
        }

        response = response.concat(result.value.prices);
        this.logger.debug(`[MultiFeedProcessor] fulfilled ${classNames[i]}: ${JSON.stringify(result.value)}`);
      } else {
        this.logger.warn(`[MultiFeedProcessor] Ignored ${classNames[i]}. Reason: ${result.reason}`);
      }
    });

    await this.priceDataRepository.savePrices(payloads);

    return response;
  }

  private getInputs<T>(feedFetchers: FeedFetcher[], fetcherName: FetcherName): T[] {
    return feedFetchers.filter((fetcher) => fetcher.name === fetcherName).map((fetcher) => fetcher.params as T);
  }
}
