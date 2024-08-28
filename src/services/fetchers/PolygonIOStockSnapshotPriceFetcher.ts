import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {BasePolygonIOSnapshotFetcher, SnapshotResponse} from './common/BasePolygonIOSnapshotFetcher.js';
import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetchedValueType,
  FetcherName,
  FetcherResult,
} from '../../types/fetchers.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import {PolygonIOStockSnapshotDataRepository} from '../../repositories/fetchers/PolygonIOStockSnapshotDataRepository.js';

export interface PolygonIOStockSnapshotFetcherInputParams {
  ticker: string;
}

type ParsedResponse = {ticker: string; price: number; timestamp: number};

@injectable()
export class PolygonIOStockSnapshotPriceFetcher extends BasePolygonIOSnapshotFetcher implements FeedFetcherInterface {
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(PolygonIOStockSnapshotDataRepository)
  polygonIOStockSnapshotDataRepository!: PolygonIOStockSnapshotDataRepository;

  constructor(@inject('Settings') settings: Settings) {
    super();

    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.logPrefix = `[${FetcherName.PolygonIOStockSnapshotPrice}]`;
  }

  async apply(params: PolygonIOStockSnapshotFetcherInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    try {
      await this.fetchPrices();
    } catch (e) {
      this.logger.error(`${this.logPrefix} fetchPrices: ${(e as Error).message}`);
    }

    const prices = await this.polygonIOStockSnapshotDataRepository.getPrices(params, options.timestamp);

    const fetcherResults: FetcherResult = {prices, timestamp: options.timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResults,
      options.symbols,
      FetcherName.PolygonIOCryptoSnapshotPrice,
      FetchedValueType.Price,
    );

    return fetcherResults;
  }

  private async fetchPrices(): Promise<void> {
    this.logger.debug(`${this.logPrefix} call`);

    const baseUrl = 'https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers';
    const sourceUrl = `${baseUrl}?apiKey=${this.apiKey}`;

    const response = <SnapshotResponse>await this.fetch(sourceUrl, true);
    const parsed = this.parseResponse(response);

    await this.savePrices(parsed);
  }

  private parseResponse(response: SnapshotResponse): ParsedResponse[] {
    if (response.message) {
      this.logger.warn(`${this.logPrefix} ${response.message}`);
    }

    if (response.error) {
      this.logger.error(`${this.logPrefix} ${response.error}`);
    }

    return response.tickers
      .map(({ticker, lastTrade}) => {
        if (!lastTrade) {
          return;
        }

        const value = lastTrade.p;

        if (isNaN(value)) {
          this.logger.warn(`${this.logPrefix} NaN: ${ticker}`);
          return;
        }

        this.logger.debug(`${this.logPrefix} fetched: ${ticker}: ${value}`);
        return {ticker: ticker, price: value, timestamp: Math.trunc(lastTrade.t / 1e6)};
      })
      .filter((e) => !!e) as ParsedResponse[];
  }

  private async savePrices(parsed: ParsedResponse[]): Promise<void> {
    const allData = parsed.map((data) => {
      return {
        timestamp: data.timestamp,
        value: data.price,
        params: {
          ticker: data.ticker,
          inverse: false,
        },
      };
    });

    await this.polygonIOStockSnapshotDataRepository.save(allData);
  }
}
