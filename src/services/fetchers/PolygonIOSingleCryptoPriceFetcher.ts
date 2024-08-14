import {inject, injectable} from 'inversify';

import Settings from '../../types/Settings.js';
import {BasePolygonIOSingleFetcher, SinglePriceResponse} from './common/BasePolygonIOSingleFetcher.js';
import {
  FeedFetcherInterface,
  FeedFetcherOptions,
  FetchedValueType,
  FetcherName,
  FetcherResult,
} from '../../types/fetchers.js';
import {PriceDataRepository} from '../../repositories/PriceDataRepository.js';
import TimeService from '../TimeService.js';
import {
  PolygonIOSingleCryptoDataRepository,
  PolygonIOSingleCryptoDataRepositoryInput,
} from '../../repositories/fetchers/PolygonIOSingleCryptoDataRepository.js';

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
export class PolygonIOSingleCryptoPriceFetcher extends BasePolygonIOSingleFetcher implements FeedFetcherInterface {
  @inject(PolygonIOSingleCryptoDataRepository) pIOSingleCryptoDataRepository!: PolygonIOSingleCryptoDataRepository;
  @inject(PriceDataRepository) priceDataRepository!: PriceDataRepository;
  @inject(TimeService) timeService!: TimeService;

  private logPrefix = `[${FetcherName.PolygonIOSingleCryptoPrice}]`;

  constructor(@inject('Settings') settings: Settings) {
    super();
    this.apiKey = settings.api.polygonIO.apiKey;
    this.timeout = settings.api.polygonIO.timeout;
    this.valuePath = '$.last.price';
  }

  async apply(params: PolygonIOSingleCryptoPriceInputParams[], options: FeedFetcherOptions): Promise<FetcherResult> {
    const responses = await Promise.all(params.map((p) => this.fetchPrice(p)));
    const parsed = this.parseResponse(responses.filter((r) => r !== undefined) as SinglePriceResponse[]);
    await this.savePrices(parsed);

    const timestamp = options.timestamp ?? this.timeService.apply();
    const prices = await this.pIOSingleCryptoDataRepository.getPrices(params, timestamp);
    const fetcherResults: FetcherResult = {prices, timestamp};

    // TODO this will be deprecated once we fully switch to DB and have dedicated charts
    await this.priceDataRepository.saveFetcherResults(
      fetcherResults,
      options.symbols,
      FetcherName.PolygonIOSingleCryptoPrice,
      FetchedValueType.Price,
    );

    return fetcherResults;
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

        return {symbol, price: value, timestamp: last.timestamp / 1e3};
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
}
