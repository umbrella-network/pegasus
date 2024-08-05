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

type ParsedResponse = {symbol: string; usdIndexPrice: number | undefined; lastPrice: number};

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

    const {data, timestamp} = this.parseResponse(response);
    await this.savePrices(timestamp, data);

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
        value: data.lastPrice,
        usdIndexPrice: data.usdIndexPrice,
        params: {
          symbol: data.symbol,
        },
      };
    });

    await this.byBitDataRepository.save(allData);
  }

  private parseResponse(response: AxiosResponse): {data: ParsedResponse[]; timestamp: number} {
    const output: ParsedResponse[] = [];

    if (response.status !== 200) {
      this.logger.error(`${this.logPrefix} status ${response.status}`);
      return {data: [], timestamp: 0};
    }

    if (response.data.retMsg !== 'OK') {
      this.logger.error(`${this.logPrefix} error: ${response.data.retMsg}`);
      return {data: [], timestamp: 0};
    }

    if (response.data.Response === 'Error') {
      this.logger.error(`${this.logPrefix} error: ${response.data.Message}`);
      return {data: [], timestamp: 0};
    }

    response.data.result.list.forEach((asset: {symbol: string; usdIndexPrice?: string; lastPrice: string}) => {
      if (!asset.lastPrice) {
        this.logger.warn(`${this.logPrefix} lastPrice missing for ${asset.symbol}`);
        return;
      }

      const lastPrice = parseFloat(asset.lastPrice);
      const usdIndexPrice = asset.usdIndexPrice ? parseFloat(asset.usdIndexPrice) : undefined;

      if (isNaN(lastPrice)) {
        this.logger.error(`${this.logPrefix} lastPrice NaN: ${asset.symbol}: ${asset.lastPrice}`);
        return;
      }

      output.push({symbol: asset.symbol, usdIndexPrice, lastPrice});
      this.logger.debug(`${this.logPrefix} resolved price: ${asset.symbol}: ${lastPrice} / ${usdIndexPrice}`);
    });

    this.logger.debug(`${this.logPrefix} time: ${response.data.result.time}`);

    return {data: output, timestamp: parseInt(response.data.result.time) / 1000};
  }
}
