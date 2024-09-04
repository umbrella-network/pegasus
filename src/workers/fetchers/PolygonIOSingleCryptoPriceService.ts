import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {FetcherName, ServiceInterface} from '../../types/fetchers.js';
import TimeService from '../../services/TimeService.js';
import {
  PolygonIOSingleCryptoDataRepository,
  PolygonIOSingleCryptoDataRepositoryInput,
} from '../../repositories/fetchers/PolygonIOSingleCryptoDataRepository.js';
import {MappingRepository} from '../../repositories/MappingRepository.js';
import {
  BasePolygonIOSingleFetcher,
  SinglePriceResponse,
} from '../../services/fetchers/common/BasePolygonIOSingleFetcher.js';

export interface PolygonIOSingleCryptoPriceInputParams {
  fsym: string;
  tsym: string;
}

type ParsedResponse = {
  symbol: string;
  price: number;
  timestamp: number;
};

@injectable()
export class PolygonIOSingleCryptoPriceService extends BasePolygonIOSingleFetcher implements ServiceInterface {
  @inject(MappingRepository) private mappingRepository!: MappingRepository;
  @inject(PolygonIOSingleCryptoDataRepository) pIOSingleCryptoDataRepository!: PolygonIOSingleCryptoDataRepository;
  @inject(TimeService) timeService!: TimeService;

  constructor(@inject('Settings') settings: Settings) {
    super();
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.last.price';

    this.logPrefix = `[${FetcherName.PolygonIOSingleCryptoPrice}]`;
  }

  async apply(): Promise<void> {
    try {
      const params = await this.getInput();

      if (params.length === 0) {
        this.logger.debug(`${this.logPrefix} no inputs to fetch`);
        return;
      }

      await this.fetchPrices(params);
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }
  }

  private async fetchPrices(params: PolygonIOSingleCryptoPriceInputParams[]): Promise<void> {
    const responses = await Promise.all(params.map((p) => this.fetchPrice(p)));
    const parsed = this.parseResponse(responses.filter((r) => r !== undefined) as SinglePriceResponse[]);
    await this.savePrices(parsed);
  }

  private async fetchPrice({
    fsym,
    tsym,
  }: PolygonIOSingleCryptoPriceInputParams): Promise<SinglePriceResponse | undefined> {
    try {
      this.logger.debug(`${this.logPrefix} call for ${fsym}-${tsym}`);
      const sourceUrl = `https://api.polygon.io/v1/last/crypto/${fsym}/${tsym}?apiKey=${this.apiKey}`;
      return <SinglePriceResponse>await this.fetch(sourceUrl, true);
    } catch (e) {
      this.logger.error(`${this.logPrefix} fail to fetch price for ${fsym}-${tsym}`);
    }
  }

  private parseResponse(response: SinglePriceResponse[]): ParsedResponse[] {
    return response
      .map(({symbol, last}) => {
        const value = last.price;

        if (isNaN(value)) {
          this.logger.warn(`${this.logPrefix} NaN: ${symbol}`);
          return;
        }

        return {symbol, price: value, timestamp: Math.trunc(last.timestamp / 1e3)};
      })
      .filter((e) => !!e) as ParsedResponse[];
  }

  private async savePrices(parsed: ParsedResponse[]): Promise<void> {
    const allData = parsed.map((data) => {
      return <PolygonIOSingleCryptoDataRepositoryInput>{
        timestamp: data.timestamp,
        value: data.price,
        params: {
          symbol: data.symbol,
        },
      };
    });

    await this.pIOSingleCryptoDataRepository.save(allData);
  }

  private async getInput(): Promise<PolygonIOSingleCryptoPriceInputParams[]> {
    const key = `${FetcherName.PolygonIOSingleCryptoPrice}_cachedParams`;

    const cache = await this.mappingRepository.get(key);
    const cachedParams = JSON.parse(cache || '{}');

    return Object.keys(cachedParams).map((fsymTsym) => {
      const [fsym, tsym] = fsymTsym.split(';');
      return {fsym, tsym};
    });
  }
}
