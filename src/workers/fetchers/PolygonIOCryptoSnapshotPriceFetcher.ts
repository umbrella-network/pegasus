import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {FetcherName, ServiceInterface} from '../../types/fetchers.js';

import {PolygonIOCryptoSnapshotDataRepository} from '../../repositories/fetchers/PolygonIOCryptoSnapshotDataRepository.js';
import {
  BasePolygonIOSnapshotFetcher,
  SnapshotResponse,
} from '../../services/fetchers/common/BasePolygonIOSnapshotFetcher.js';
import {DeviationFeedsGetter} from './_common/DeviationFeedsGetter.js';

type ParsedResponse = {symbol: string; price: number; timestamp: number};

@injectable()
export class PolygonIOCryptoSnapshotPriceFetcher extends BasePolygonIOSnapshotFetcher implements ServiceInterface {
  @inject(DeviationFeedsGetter) feedsGetter!: DeviationFeedsGetter;
  @inject(PolygonIOCryptoSnapshotDataRepository)
  pIOCryptoSnapshotDataRepository!: PolygonIOCryptoSnapshotDataRepository;

  constructor(@inject('Settings') settings: Settings) {
    super();

    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.tickers[*].lastTrade.p';

    this.logPrefix = `[${FetcherName.PolygonIOCryptoSnapshotPrice}]`;
  }

  async apply(): Promise<void> {
    try {
      const params = await this.feedsGetter.apply<string[]>(FetcherName.PolygonIOCryptoSnapshotPrice);
      if (params.length === 0) return;

      await this.fetchPrices();
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }
  }

  private async fetchPrices(): Promise<void> {
    this.logger.debug(`${this.logPrefix} call`);

    const baseUrl = 'https://api.polygon.io/v2/snapshot/locale/global/markets/crypto/tickers';
    const sourceUrl = `${baseUrl}?apiKey=${this.apiKey}`;

    const response = <SnapshotResponse>await this.fetch(sourceUrl, true);
    const parsed = this.parseResponse(response);

    await this.savePrices(parsed);
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
        return {symbol: ticker, price: value, timestamp: Math.trunc(lastTrade.t / 1e3)};
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
