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

import {PolygonIOCryptoSnapshotDataRepository} from '../../repositories/fetchers/PolygonIOCryptoSnapshotDataRepository.js';
import TimeService from '../TimeService.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';

export interface PolygonIOCryptoSnapshotInputParams {
  symbol: string;
  fsym?: string; // TODO backwards compatible, to remove
  tsym?: string; // TODO backwards compatible, to remove
}

type ParsedResponse = {symbol: string; price: number; timestamp: number};

@injectable()
export class PolygonIOCryptoSnapshotPriceFetcher extends BasePolygonIOSnapshotFetcher implements FeedFetcherInterface {
  @inject(PolygonIOCryptoSnapshotDataRepository)
  pIOCryptoSnapshotDataRepository!: PolygonIOCryptoSnapshotDataRepository;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;

  private logPrefix = `[${FetcherName.PolygonIOCryptoSnapshotPrice}]`;

  constructor(@inject('Settings') settings: Settings) {
    super();

    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.tickers[*].lastTrade.p';
  }

  async apply(params: PolygonIOCryptoSnapshotInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    try {
      await this.fetchPrices();
    } catch (e) {
      this.logger.error(`${this.logPrefix} fetchPrices: ${(e as Error).message}`);
    }

    const prices = await this.pIOCryptoSnapshotDataRepository.getPrices(
      this.backwardsCompatibleParams(params),
      options.timestamp,
    );

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

    const baseUrl = 'https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers';
    const sourceUrl = `${baseUrl}?apiKey=${this.apiKey}`;

    const response = <SnapshotResponse>await this.fetch(sourceUrl, true);
    const parsed = this.parseResponse(response);

    await this.savePrices(parsed);
  }

  private backwardsCompatibleParams(
    params: PolygonIOCryptoSnapshotInputParams[],
  ): PolygonIOCryptoSnapshotInputParams[] {
    return params.map((p) => {
      if (p.symbol) return p;

      return {
        symbol: `X:${p.fsym}${p.tsym}`,
      };
    });
  }

  private parseResponse(response: SnapshotResponse): ParsedResponse[] {
    return response.tickers
      .map(({ticker, lastTrade}) => {
        const value = lastTrade.p;

        if (isNaN(value)) {
          this.logger.warn(`${this.logPrefix} NaN: ${ticker}`);
          return;
        }

        this.logger.debug(`${this.logPrefix} fetched: ${ticker}: ${value}`);
        return {symbol: ticker, price: value, timestamp: Math.trunc(lastTrade.t / 1e6)};
      })
      .filter((e) => !!e) as ParsedResponse[];
  }

  private async savePrices(parsed: ParsedResponse[]): Promise<void> {
    const allData = parsed.map((data) => {
      return {
        timestamp: data.timestamp,
        value: data.price,
        params: {
          symbol: data.symbol,
          inverse: false,
        },
      };
    });

    await this.pIOCryptoSnapshotDataRepository.save(allData);
  }
}
