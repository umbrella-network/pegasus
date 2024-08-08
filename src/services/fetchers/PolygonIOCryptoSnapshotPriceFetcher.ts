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
}

type ParsedResponse = {symbol: string; price: number};

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
    const symbols = params.map((p) => p.symbol).join(', ');
    this.logger.debug(`${this.logPrefix} call for ${symbols}`);

    const baseUrl = 'https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/';
    const sourceUrl = `${baseUrl}tickers?tickers=${symbols}&apiKey=${this.apiKey}`;

    const response = <SnapshotResponse>await this.fetch(sourceUrl, true);
    const parsed = this.parseResponse(response);
    const timestamp = options.timestamp ?? this.timeService.apply();

    await this.savePrices(timestamp, parsed);

    const prices = await this.pIOCryptoSnapshotDataRepository.getPrices(params, timestamp);

    const fetcherResults: FetcherResult = {prices, timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResults,
      options.symbols,
      FetcherName.PolygonIOCryptoSnapshotPrice,
      FetchedValueType.Price,
    );

    return fetcherResults;
  }

  private parseResponse(response: SnapshotResponse): ParsedResponse[] {
    return response.tickers
      .map(({ticker, lastTrade}) => {
        const value = lastTrade.p;

        if (isNaN(value)) {
          this.logger.warn(`${this.logPrefix} NaN: ${ticker}`);
          return;
        }

        return {symbol: ticker, price: value};
      })
      .filter((e) => !!e) as ParsedResponse[];
  }

  private async savePrices(timestamp: number, parsed: ParsedResponse[]): Promise<void> {
    const allData = parsed.map((data) => {
      return {
        timestamp,
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
