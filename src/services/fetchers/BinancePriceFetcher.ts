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

export interface BinancePriceInputParams {
  symbol: string;
  inverse: boolean;
}

@injectable()
export class BinancePriceFetcher implements FeedFetcherInterface {
  @inject(BinanceDataRepository) binanceDataRepository!: BinanceDataRepository;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') private logger!: Logger;

  private timeout: number;
  private logPrefix = `[${FetcherName.BinancePrice}]`;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.binance.timeout;
  }

  async apply(inputs: BinancePriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    const prices = await this.binanceDataRepository.getPrices(inputs, options.timestamp);

    const fetcherResults: FetcherResult = {
      prices: prices.map((price, ix) =>
        price !== undefined && price != 0 && inputs[ix].inverse ? 1.0 / price : price,
      ),
      timestamp: options.timestamp,
    };

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResults,
      options.symbols,
      FetcherName.BinancePrice,
      FetchedValueType.Price,
      BinancePriceFetcher.fetcherSource,
    );

    return fetcherResults;
  }
}
