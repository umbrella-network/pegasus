import axios, {AxiosResponse} from 'axios';
import {inject, injectable} from 'inversify';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';

import {ServiceInterface} from '../../types/fetchers.js';
import {ByBitDataRepository, ByBitDataRepositoryInput} from '../../repositories/fetchers/ByBitDataRepository.js';

type ParsedResponse = {symbol: string; usdIndexPrice: number | undefined; lastPrice: number};

@injectable()
export class ByBitPriceFetcher implements ServiceInterface {
  @inject(ByBitDataRepository) byBitDataRepository!: ByBitDataRepository;
  @inject('Logger') protected logger!: Logger;

  private timeout: number;
  private logPrefix = '[ByBitPriceService]';

  constructor(@inject('Settings') settings: Settings) {
    this.timeout = settings.api.byBit.timeout;
  }

  async apply(): Promise<void> {
    try {
      await this.fetchPrices();
    } catch (e) {
      this.logger.error(`${this.logPrefix} failed: ${(e as Error).message}`);
    }
  }

  private async fetchPrices(): Promise<void> {
    const sourceUrl = 'https://api.bybit.com/v5/market/tickers?category=spot';

    this.logger.debug(`${this.logPrefix} call for: ${sourceUrl}`);

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
    });

    const {data, timestamp} = this.parseResponse(response);
    await this.savePrices(timestamp, data);
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

    const timestamp = Math.trunc(parseInt(response.data.time) / 1000);
    this.logger.debug(`${this.logPrefix} time: ${timestamp} (raw: ${response.data.time})`);
    return {data: output, timestamp};
  }
}
