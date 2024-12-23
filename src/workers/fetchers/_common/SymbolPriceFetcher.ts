import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import TimeService from '../../../services/TimeService.js';
import {FetcherName, ServiceInterface} from '../../../types/fetchers.js';
import {SymbolDataRepository} from '../../../repositories/fetchers/common/SymbolDataRepository.js';

export type SymbolParsedResponse = {symbol: string; price: number};

@injectable()
export abstract class SymbolPriceFetcher implements ServiceInterface {
  @inject(TimeService) timeService!: TimeService;
  @inject('Logger') protected logger!: Logger;

  protected dataRepository!: SymbolDataRepository;
  protected timeout!: number;
  protected logPrefix = '[SET THIS IS CONSTRUCTOR]';
  protected sourceUrl = '[SET THIS IS CONSTRUCTOR]';
  protected fetcherName!: FetcherName;

  static fetcherSource = '';

  // constructor(@inject('Settings') settings: Settings) {
  //   this.timeout = settings.api.binance.timeout;
  // }

  async apply(): Promise<void> {
    try {
      await this.fetchPrices();
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }
  }

  private async fetchPrices(): Promise<void> {
    this.logger.debug(`${this.logPrefix} call for: ${this.sourceUrl}`);

    const response = await axios.get(this.sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${this.sourceUrl}`,
    });

    const {parsed, timestamp} = this.parseResponse(response);
    await this.savePrices(timestamp ?? this.timeService.apply(), parsed);
  }

  protected parseResponse(axiosResponse: AxiosResponse): {
    timestamp?: number;
    parsed: SymbolParsedResponse[];
  } {
    this.logger.debug(JSON.stringify(axiosResponse));
    new Error('[SymbolPriceFetcher] please override `parseResponse()`');
    return {timestamp: 0, parsed: []};
  }

  private async savePrices(timestamp: number, parsed: SymbolParsedResponse[]): Promise<void> {
    const allData = parsed.map((data) => {
      return {
        timestamp,
        value: data.price,

        params: {
          symbol: data.symbol,
        },
      };
    });

    await this.dataRepository.save(allData, this.fetcherName);
  }
}
