import axios from 'axios';
import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';
import {Logger} from 'winston';

import Settings from '../../types/Settings.js';
import {mapParams} from '../../utils/request.js';

@injectable()
class CryptoCompareHistoDayFetcher {
  @inject('Logger') private logger!: Logger;

  private apiKey: string;
  private timeout: number;

  constructor(@inject('Settings') settings: Settings) {
    this.apiKey = settings.api.cryptocompare.apiKey;
    this.timeout = settings.api.cryptocompare.timeout;
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
  async apply(params: any): Promise<[any, number][] | undefined> {
    const sourceUrl = `https://min-api.cryptocompare.com/data/v2/histoday${mapParams(params)}`;
    this.logger.debug(`[CryptoCompareHistoDayFetcher] call for: ${JSON.stringify(params)}`);

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
      {
        high,
        low,
        open,
        close,
      },
      volume,
    ]);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValue = (data: any, valuePath: string): any[] => {
    this.logger.debug(`[CryptoCompareHistoDayFetcher] resolved price: ${JSON.stringify(data)}`);
    return JSONPath({json: data, path: valuePath});
  };
}

export default CryptoCompareHistoDayFetcher;
