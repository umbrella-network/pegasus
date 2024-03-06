import axios from 'axios';
import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings.js';
import {mapParams} from '../../utils/request.js';
import {AbstractFetcher} from './AbstractFetcher';
import {CryptoCompareHistoFetcherResult} from '../../types/fetchers.js';

@injectable()
class CryptoCompareHistoHourFetcher extends AbstractFetcher {
  private apiKey: string;
  private timeout: number;

  constructor(@inject('Settings') settings: Settings) {
    super();
    this.apiKey = settings.api.cryptocompare.apiKey;
    this.timeout = settings.api.cryptocompare.timeout;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async apply(params: any): Promise<CryptoCompareHistoFetcherResult[] | undefined> {
    const sourceUrl = `https://min-api.cryptocompare.com/data/v2/histohour${mapParams(params)}`;

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
      headers: {Authorization: `Apikey ${this.apiKey}`},
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    if (response.data.Response === 'Error') {
      throw new Error(response.data.Message);
    }

    return this.extractValue(response.data, '$.[:0]').map(({high, low, open, close, volumefrom: volume}) => [
      {high, low, open, close},
      volume,
    ]);
  }

  private extractValue = (
    data: any, // eslint-disable-line @typescript-eslint/no-explicit-any
    valuePath: string,
  ): {high: number; low: number; open: number; close: number; volumefrom: number}[] => {
    this.logger.debug(`[CryptoCompareHistoHourFetcher] resolved price: ${JSON.stringify(data)}`);
    return JSONPath({json: data, path: valuePath});
  };
}

export default CryptoCompareHistoHourFetcher;
