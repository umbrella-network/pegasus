import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import Settings from '../../types/Settings.js';
import TimeService from '../../services/TimeService.js';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherResult,
  FetcherName,
  FetchedValueType,
} from '../../types/fetchers.js';

import {BinanceDataRepository} from '../../repositories/fetchers/BinanceDataRepository.js';
import {
  BinanceCandlestickFetcher,
  BinanceCandlestickInterval,
} from '../../workers/fetchers/BinanceCandlestickFetcher.js';

export interface BinancePriceInputParams {
  symbol: string;
  inverse: boolean;
  vwapInterval?: BinanceCandlestickInterval;
}

@injectable()
export class BinancePriceGetter implements FeedFetcherInterface {
  @inject(BinanceDataRepository) binanceDataRepository!: BinanceDataRepository;
  @inject(BinanceCandlestickFetcher) candlestickFetcher!: BinanceCandlestickFetcher;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private timeout: number;
  private logPrefix = `[${FetcherName.BinancePrice}]`;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.binance.timeout;
  }

  async apply(params: BinancePriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    if (params.length === 0) {
      this.logger.debug(`${this.logPrefix} no inputs to fetch`);
      return {prices: []};
    }

    const prices = await this.binanceDataRepository.getPrices(params, options.timestamp);
    const candles = await this.candlestickFetcher.apply(params, options.timestamp);
    this.logger.debug(`${this.logPrefix} candles ${JSON.stringify(candles)}`);

    const fetcherResults: FetcherResult = {
      prices: prices.map((price, ix) => {
        const volume = candles[ix]?.value;

        return {
          value: price.value !== undefined && price.value != 0 && params[ix].inverse ? 1.0 / price.value : price.value,
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
      FetcherName.BinancePrice,
      FetchedValueType.Price,
      BinancePriceGetter.fetcherSource,
    );

    return fetcherResults;
  }
}
