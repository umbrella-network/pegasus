import axios from 'axios';
import {inject, injectable} from 'inversify';
import {JSONPath} from 'jsonpath-plus';

import Settings from '../../types/Settings';

@injectable()
class CoinmarketcapHistoDayFetcher {
  private apiKey: string;
  private timeout: number;

  constructor(
    @inject('Settings') settings: Settings
  ) {
    this.apiKey = settings.api.coinmarketcap.apiKey;
    this.timeout = settings.api.coinmarketcap.timeout;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async apply(params: any): Promise<[any, number][] | undefined> {
    const sourceUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/ohlcv/historical?symbol=${params.symbol}&convert=${params.convert}&time_period=daily&interval=daily&count=${params.count}&CMC_PRO_API_KEY=${this.apiKey}`;

    const response = await axios.get(sourceUrl, {
      timeout: this.timeout,
      timeoutErrorMessage: `Timeout exceeded: ${sourceUrl}`,
      headers: {'Authorization': `Apikey ${this.apiKey}`}
    });

    if (response.status !== 200) {
      throw new Error(response.data);
    }

    if (response.data.Response === 'Error') {
      throw new Error(response.data.Message);
    }

    return this.extractValue(response.data, '$.data.quotes.*.quote.*').map(({high, low, open, close, volume}) => ([
      {
        high,
        low,
        open,
        close
      }, volume ?? 0
    ]));
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractValue = (data: any, valuePath: string): any[] => {
    return JSONPath({json: data, path: valuePath});
  }
}

export default CoinmarketcapHistoDayFetcher;
