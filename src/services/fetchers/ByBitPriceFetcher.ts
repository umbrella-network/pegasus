import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import TimeService from '../../services/TimeService.js';

import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetcherResult,
  FetcherName,
  PriceValueType,
} from '../../types/fetchers.js';

import {ByBitDataRepository, ByBitDataRepositoryInput} from '../../repositories/fetchers/ByBitDataRepository.js';

export interface ByBitPriceInputParams {
  symbol: string;
}

type ParsedResponse = {symbol: string; value: number};

@injectable()
export default class ByBitPriceFetcher implements FeedFetcherInterface {
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(ByBitDataRepository) byBitDataRepository!: ByBitDataRepository;
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') protected logger!: Logger;

  private timeout: number;
  private logPrefix = `[${FetcherName.BinancePrice}]`;
  static fetcherSource = '';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.byBit.timeout;
  }

  async apply(inputs: ByBitPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    const sourceUrl = 'https://api.bybit.com/v5/market/tickers?category=spot';

    this.logger.debug(`${this.logPrefix} call for: ${sourceUrl}`);

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
    });

    const timestamp = this.timeService.apply();
    const parsed = this.parseResponse(response);
    await this.savePrices(timestamp, parsed);

    const prices = await this.byBitDataRepository.getPrices(inputs, timestamp);
    const fetcherResult = {prices, timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResult,
      options.symbols,
      FetcherName.ByBitPrice,
      PriceValueType.Price,
      ByBitPriceFetcher.fetcherSource,
    );

    return fetcherResult;
  }

  private async savePrices(timestamp: number, parsed: ParsedResponse[]): Promise<void> {
    const allData: ByBitDataRepositoryInput[] = parsed.map((data) => {
      return {
        timestamp,
        value: data.value,
        params: {
          symbol: data.symbol,
        },
      };
    });

    await this.byBitDataRepository.save(allData);
  }

  private parseResponse(response: AxiosResponse): ParsedResponse[] {
    const output: ParsedResponse[] = [];

    if (response.status !== 200) {
      this.logger.error(`${this.logPrefix} status ${response.status}`);
      return [];
    }

    if (response.data.Response === 'Error') {
      this.logger.error(`${this.logPrefix} error: ${response.data.Message}`);
      return [];
    }

    response.data.result.list.forEach((asset: {symbol: string; usdIndexPrice: string}) => {
      if (!asset.usdIndexPrice) {
        this.logger.warn(`${this.logPrefix} error: ${response.data.Message}`);
        return;
      }

      const value = parseFloat(asset.usdIndexPrice);

      if (isNaN(value)) {
        this.logger.error(`${this.logPrefix} resolved price: ${asset.symbol}: ${value}`);
        return;
      }

      output.push({symbol: asset.symbol, value});
      this.logger.debug(`${this.logPrefix} resolved price: ${asset.symbol}: ${value}`);
    });

    return output;
  }
}
