import axios from 'axios';
import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings';
import {mapParams} from "../../utils/request";

@injectable()
class CryptoCompareHistoHourFetcher {
  private apiKey: string;
  private timeout: number;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.apiKey = settings.api.cryptocompare.apiKey;
    this.timeout = settings.api.cryptocompare.timeout;
  }

  // eslint-disable-next-line
  async apply(params: any): Promise<[any, number][] | undefined> {
    const sourceUrl = `https://min-api.cryptocompare.com/data/v2/histohour${mapParams(params)}`;

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
      headers: {'Authorization': `token ${this.apiKey}`}
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    if (response.data.Response === 'Error') {
      throw new Error(response.data.Message);
    }

    return this.extractValue(response.data, '$.[:0]').map(({high, low, open, close, volumefrom: volume}) => ([
      {
        high,
        low,
        open,
        close
      }, volume
    ]));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValue = (data: any, valuePath: string): any[] => {
    return JSONPath({json: data, path: valuePath});
  }
}

export default CryptoCompareHistoHourFetcher;
