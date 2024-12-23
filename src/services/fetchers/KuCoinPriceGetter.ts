import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import TimeService from '../../services/TimeService.js';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherResult,
  FetcherName,
  FetchedValueType,
} from '../../types/fetchers.js';

import {KuCoinDataRepository} from '../../repositories/fetchers/KuCoinDataRepository.js';
import {KuCoinCandlestickFetcher, KuCoinCandlestickInterval} from '../../workers/fetchers/KuCoinCandlestickFetcher.js';

export interface KuCoinPriceInputParams {
  symbol: string;
  vwapInterval?: KuCoinCandlestickInterval;
}

@injectable()
export class KuCoinPriceGetter implements FeedFetcherInterface {
  @inject(KuCoinDataRepository) dataRepository!: KuCoinDataRepository;
  @inject(KuCoinCandlestickFetcher) candlestickFetcher!: KuCoinCandlestickFetcher;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private logPrefix = `[${FetcherName.KuCoinPrice}]`;
  static fetcherSource = '';

  async apply(params: KuCoinPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    const prices = await this.dataRepository.getPrices(params, options.timestamp);
    const candles = await this.candlestickFetcher.apply(params, options.timestamp);
    this.logger.debug(`${this.logPrefix} candles ${JSON.stringify(candles)}`);

    const fetcherResults: FetcherResult = {
      prices: prices.map((price, ix) => {
        const volume = candles[ix]?.value;

        return {
          value: price.value,
          vwapVolume: volume ? parseFloat(volume) : undefined,
        };
      }),
      timestamp: options.timestamp,
    };

    this.logger.debug(`${this.logPrefix} fetcherResult ${JSON.stringify(fetcherResults)}`);

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResults,
      options.symbols,
      FetcherName.KuCoinPrice,
      FetchedValueType.Price,
      KuCoinPriceGetter.fetcherSource,
    );

    return fetcherResults;
  }
}
